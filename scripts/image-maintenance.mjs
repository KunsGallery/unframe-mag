import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { articleImageUrls, replaceArticleImages } from './lib/articleImages.mjs';

const project = 'uarchive-8e437';
const command = process.argv[2] || 'audit';
const directory = path.resolve(process.argv[3] || '.image-migration/2026-10-19');
const require = createRequire(import.meta.url);
const api = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const readJson = async (file) => JSON.parse(await readFile(path.join(directory, file), 'utf8'));
const saveJson = (file, value) => writeFile(path.join(directory, file), JSON.stringify(value, null, 2), { mode: 0o600 });
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const providerErrorHashes = new Set(['3924575580e7b987e65ce7de63a3a51655e9c2abaafdf76d204174d1992c8a04']);
function decode(field) {
  if (!field) return null;
  if ('mapValue' in field) return Object.fromEntries(Object.entries(field.mapValue.fields || {}).map(([key, value]) => [key, decode(value)]));
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(decode);
  if ('integerValue' in field || 'doubleValue' in field) return Number(field.integerValue ?? field.doubleValue);
  return field.stringValue ?? field.booleanValue ?? field.timestampValue ?? null;
}
async function token() {
  const modulePath = process.env.FIREBASE_CLI_AUTH_MODULE;
  if (!modulePath) throw new Error('Set FIREBASE_CLI_AUTH_MODULE to your installed firebase-tools/lib/auth.js. Tokens are never printed or stored.');
  const auth = require(path.resolve(modulePath));
  return (await auth.getAccessToken(auth.getGlobalDefaultAccount()?.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform'])).access_token;
}
async function firestore(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(`Firestore ${response.status}: ${result.error?.message || 'request failed'}`), { code: result.error?.status });
  return result;
}
async function download(url) {
  const parsed = new URL(url);
  if (!['i.ibb.co', 'res.cloudinary.com'].includes(parsed.hostname) || parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Image host is not allowlisted');
  const response = await fetch(url, { signal: AbortSignal.timeout(Number(process.env.IMAGE_DOWNLOAD_TIMEOUT_MS) || 25000), redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!['i.ibb.co', 'res.cloudinary.com'].includes(new URL(response.url).hostname)) throw new Error('Unexpected redirect host');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > 40 * 1024 * 1024) throw new Error('Image exceeds 40 MB'); chunks.push(chunk); }
  const bytes = Buffer.concat(chunks);
  const hash = sha256(bytes);
  if (providerErrorHashes.has(hash)) throw new Error('Provider error placeholder, not an original image');
  const metadata = await sharp(bytes, { limitInputPixels: 100000000 }).metadata();
  if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'avif', 'gif', 'heif'].includes(metadata.format)) throw new Error('Response is not a supported image');
  return { bytes, metadata, finalUrl: response.url, hash, contentType: response.headers.get('content-type') };
}
async function audit() {
  let existing = false;
  try { await access(path.join(directory, 'articles-backup.json')); existing = true; if (!process.argv.includes('--resume')) throw new Error('This backup already exists; choose a new directory or pass --resume.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(path.join(directory, 'originals'), { recursive: true, mode: 0o700 });
  const documents = existing ? (await readJson('articles-backup.json')).documents : []; let pageToken = '';
  if (!existing) do {
    const result = await firestore(`${api}/articles?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    documents.push(...(result.documents || [])); pageToken = result.nextPageToken || '';
  } while (pageToken);
  if (!existing) await saveJson('articles-backup.json', { project, createdAt: new Date().toISOString(), documents });
  const articles = documents.map((document) => ({ id: document.name.split('/').at(-1), ...decode({ mapValue: { fields: document.fields } }) }));
  const urls = [...new Set(articles.flatMap(articleImageUrls))];
  const items = existing ? (await readJson('audit.json')).items : [];
  const pending = urls.filter((url) => !items.some((item) => item.url === url));
  let cursor = 0; let writes = Promise.resolve();
  async function worker() { while (cursor < pending.length) {
    const url = pending[cursor++];
    try {
      const image = await download(url);
      const filename = `${image.hash}.${image.metadata.format}`;
      await writeFile(path.join(directory, 'originals', filename), image.bytes, { mode: 0o600 });
      items.push({ url, status: 'downloaded', hash: image.hash, filename, bytes: image.bytes.length, width: image.metadata.width, height: image.metadata.height, finalUrl: image.finalUrl });
    } catch (error) { items.push({ url, status: 'unavailable', error: error.message }); }
    writes = writes.then(() => saveJson('audit.json', { project, createdAt: new Date().toISOString(), articles: articles.map((article) => ({ id: article.id, editionNo: article.editionNo, status: article.status, imageCount: articleImageUrls(article).length })), items }));
    await writes;
    console.log(`${items.length}/${urls.length} ${items.at(-1).status}`);
  } }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(JSON.stringify({ documents: documents.length, urls: urls.length, downloaded: items.filter((item) => item.status === 'downloaded').length, unavailable: items.filter((item) => item.status === 'unavailable').length }));
}
async function migrate() {
  const { items } = await readJson('audit.json');
  const rejected = new Set((process.env.REJECT_IMAGE_HASHES || '').split(',').filter(Boolean));
  if (!process.env.CONFIRM_IMAGE_REVIEW) throw new Error('Review downloaded image hashes and placeholders, then set CONFIRM_IMAGE_REVIEW=1.');
  const env = process.loadEnvFile ? (process.loadEnvFile('.env'), process.env) : process.env;
  const cloud = env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = env.VITE_CLOUDINARY_UPLOAD_PRESET || env.VITE_CLOUDINARY_UNSIGNED_PRESET;
  if (!cloud || !preset) throw new Error('Cloudinary configuration is missing');
  let mapping = {}; try { mapping = await readJson('mapping.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const item of items) {
    if (item.status !== 'downloaded' || rejected.has(item.hash) || !new URL(item.url).hostname.endsWith('ibb.co') || mapping[item.url]) continue;
    const duplicate = items.find((candidate) => candidate.hash === item.hash && mapping[candidate.url]);
    if (duplicate) { mapping[item.url] = mapping[duplicate.url]; await saveJson('mapping.json', mapping); continue; }
    const bytes = await readFile(path.join(directory, 'originals', item.filename));
    if (sha256(bytes) !== item.hash) throw new Error('Backup integrity check failed');
    // Preserve the original backup; very large source files get a high-quality
    // delivery copy to fit the existing provider's upload size limits.
    const uploadBytes = bytes.length > 8 * 1024 * 1024 ? await sharp(bytes).autoOrient().webp({ quality: 92, effort: 6 }).toBuffer() : bytes;
    const expected = await sharp(uploadBytes).metadata();
    const form = new FormData();
    form.append('file', new Blob([uploadBytes]), bytes === uploadBytes ? item.filename : `${item.hash}.webp`);
    form.append('upload_preset', preset);
    form.append('public_id', `unframe-archive-${item.hash}`);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) });
    const result = await response.json();
    if (!response.ok || !result.secure_url) throw new Error(`Cloudinary upload ${response.status}: ${result.error?.message || 'no secure URL'}`);
    const verified = await download(result.secure_url);
    if (verified.metadata.width !== expected.width || verified.metadata.height !== expected.height) throw new Error('Uploaded image dimensions differ; do not update articles');
    mapping[item.url] = result.secure_url;
    await saveJson('mapping.json', mapping);
    console.log(`Verified migration ${Object.keys(mapping).length}`);
  }
}
async function recheck() {
  const audit = await readJson('audit.json');
  const pending = audit.items.filter((item) => item.status === 'unavailable');
  let cursor = 0; let writes = Promise.resolve();
  async function worker() { while (cursor < pending.length) {
    const item = pending[cursor++];
    try {
      const image = await download(item.url);
      const filename = `${image.hash}.${image.metadata.format}`;
      await writeFile(path.join(directory, 'originals', filename), image.bytes, { mode: 0o600 });
      Object.assign(item, { status: 'downloaded', hash: image.hash, filename, bytes: image.bytes.length, width: image.metadata.width, height: image.metadata.height, finalUrl: image.finalUrl });
      delete item.error;
    } catch (error) { item.error = error.message; }
    writes = writes.then(() => saveJson('audit.json', audit)); await writes;
    console.log(`Recheck ${item.status}`);
  } }
  await Promise.all(Array.from({ length: 3 }, worker));
}
async function apply() {
  if (process.env.APPLY_IMAGE_MIGRATION !== project) throw new Error(`Set APPLY_IMAGE_MIGRATION=${project} after reviewing the mapping. Default is read-only.`);
  const backup = await readJson('articles-backup.json');
  if (backup.project !== project) throw new Error('Backup project mismatch');
  const mapping = await readJson('mapping.json');
  for (const [oldUrl, newUrl] of Object.entries(mapping)) {
    if (new URL(oldUrl).hostname !== 'i.ibb.co' || new URL(newUrl).hostname !== 'res.cloudinary.com' || !newUrl.startsWith('https://')) throw new Error('Untrusted mapping');
  }
  const savedAt = Date.now();
  let committedPlan = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const writes = []; const plan = [];
    for (const document of backup.documents) {
      const current = await firestore(`https://firestore.googleapis.com/v1/${document.name}`);
      const before = decode({ mapValue: { fields: current.fields } });
      const baseline = decode({ mapValue: { fields: document.fields } });
      const patch = replaceArticleImages(before, mapping);
      if (!Object.keys(patch).length) continue;
      for (const field of Object.keys(patch)) if (before[field] !== baseline[field]) throw new Error(`An editor changed ${document.name.split('/').at(-1)}; preserve their edits and make a fresh backup.`);
      const fields = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, { stringValue: value }]));
      writes.push({ update: { name: document.name, fields }, updateMask: { fieldPaths: Object.keys(patch) }, currentDocument: { updateTime: current.updateTime } });
      plan.push({ name: document.name, before: Object.fromEntries(Object.keys(patch).map((field) => [field, before[field]])), after: patch });
      const key = sha256(Buffer.from(document.updateTime + document.name)).slice(0, 24);
      for (const [label, value, suffix, order] of [['이미지 저장소 변경 전', before, 'before', 0], ['이미지 저장소 변경 후', { ...before, ...patch }, 'after', 1]]) {
        const snapshot = Object.fromEntries(['title', 'subtitle', 'category', 'cover', 'coverMedium', 'contentHTML'].map((field) => [field, { stringValue: String(value[field] || '') }]));
        writes.push({ update: { name: `${document.name}/history/image-migration-${key}-${suffix}`, fields: {
          version: { integerValue: '1' }, userId: { stringValue: 'image-migration' }, ownerEmail: { stringValue: before.authorEmail || '' },
          label: { stringValue: label }, savedAt: { integerValue: String(savedAt + order) }, snapshot: { mapValue: { fields: snapshot } },
        } }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] });
      }
    }
    if (plan.length) {
      committedPlan = plan;
      await saveJson('planned-writes.json', { writes, changes: plan });
      try { await firestore(`${api}:commit`, { method: 'POST', body: JSON.stringify({ writes }) }); }
      catch (error) {
        if (attempt < 2 && ['ABORTED', 'FAILED_PRECONDITION'].includes(error.code)) continue;
        throw error;
      }
    }
    for (const change of committedPlan) {
      const verified = decode({ mapValue: { fields: (await firestore(`https://firestore.googleapis.com/v1/${change.name}`)).fields } });
      for (const [field, expected] of Object.entries(change.after)) if (verified[field] !== expected) throw new Error('Post-migration verification failed; retain the backup and investigate.');
    }
    await saveJson('applied.json', { project, appliedAt: new Date().toISOString(), documents: committedPlan.length, images: Object.keys(mapping).length, changes: committedPlan });
    console.log(JSON.stringify({ updatedDocuments: committedPlan.length, mappedImages: Object.keys(mapping).length }));
    return;
  }
}
if (command === 'audit') await audit();
else if (command === 'migrate') await migrate();
else if (command === 'apply') await apply();
else if (command === 'recheck') await recheck();
else throw new Error('Use audit, recheck, migrate, or apply');
