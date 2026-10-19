import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, createContext } from 'node:vm';
import { imageUploadConfig, validateImageFile, MAX_IMAGE_BYTES } from '../src/lib/uploadWithProgress.js';

test('canonical preset and legacy preset both work, with no silent alternate host', () => {
  assert.equal(imageUploadConfig({ VITE_CLOUDINARY_CLOUD_NAME: 'gallery', VITE_CLOUDINARY_UPLOAD_PRESET: 'new', VITE_CLOUDINARY_UNSIGNED_PRESET: 'old' }).preset, 'new');
  assert.equal(imageUploadConfig({ VITE_CLOUDINARY_CLOUD_NAME: 'gallery', VITE_CLOUDINARY_UNSIGNED_PRESET: 'old' }).preset, 'old');
  assert.equal(imageUploadConfig({ VITE_CLOUDINARY_CLOUD_NAME: 'gallery', VITE_CLOUDINARY_UPLOAD_PRESET: ' ', VITE_CLOUDINARY_UNSIGNED_PRESET: 'old' }).preset, 'old');
  assert.throws(() => imageUploadConfig({ VITE_IMGBB_API_KEY: 'never-used' }), { code: 'image-upload-config' });
  assert.throws(() => imageUploadConfig({ VITE_IMAGE_PROVIDER: 'imgbb' }), { code: 'image-upload-config' });
});
test('empty, oversized, and active-content files are rejected before upload', () => {
  assert.throws(() => validateImageFile({ size: 0, type: 'image/jpeg' }), { code: 'image-upload-empty' });
  assert.throws(() => validateImageFile({ size: MAX_IMAGE_BYTES + 1, type: 'image/jpeg' }), { code: 'image-upload-size' });
  assert.throws(() => validateImageFile({ size: 5, type: 'image/svg+xml' }), { code: 'image-upload-format' });
  validateImageFile({ size: 100, type: 'image/heic' });
});

async function harness(simulate) {
  const requests = [];
  class XHR {
    upload = {};
    open(method, url) { this.method = method; this.url = url; }
    send(form) { requests.push({ url: this.url, form, timeout: this.timeout }); queueMicrotask(() => simulate(this)); }
    abort() { this.onabort?.(); }
  }
  const context = createContext({ XMLHttpRequest: XHR, URL, FormData, queueMicrotask });
  const module = new SourceTextModule(await readFile(new URL('../src/lib/uploadWithProgress.js', import.meta.url), 'utf8'), { context, initializeImportMeta: (meta) => { meta.env = { VITE_CLOUDINARY_CLOUD_NAME: 'gallery', VITE_CLOUDINARY_UPLOAD_PRESET: 'preset' }; } });
  await module.link(() => {}); await module.evaluate();
  return { api: module.namespace, requests };
}
test('successful upload validates HTTPS provider URL and reports 100 only after server confirmation', async () => {
  const progress = [];
  const h = await harness((xhr) => { xhr.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 }); xhr.status = 200; xhr.responseText = JSON.stringify({ secure_url: 'https://res.cloudinary.com/gallery/image/upload/v1/photo.jpg' }); xhr.onload(); });
  const result = await h.api.uploadImageWithProgress(new File(['test'], 'test.jpg', { type: 'image/jpeg' }), { onProgress: (value) => progress.push(value) });
  assert.match(result, /^https:\/\/res.cloudinary.com/); assert.deepEqual(progress, [99, 100]);
  assert.equal(h.requests.length, 1); assert.equal(h.requests[0].timeout, 120000);
});
test('network, timeout, invalid response and provider errors stay failed and never upload elsewhere', async () => {
  for (const [simulate, code] of [
    [(xhr) => xhr.onerror(), 'image-upload-network'], [(xhr) => xhr.ontimeout(), 'image-upload-timeout'],
    [(xhr) => { xhr.status = 200; xhr.responseText = '<html>'; xhr.onload(); }, 'image-upload-response'],
    [(xhr) => { xhr.status = 400; xhr.responseText = JSON.stringify({ error: { message: 'Invalid preset secret-value' } }); xhr.onload(); }, 'image-upload-server'],
    [(xhr) => { xhr.status = 200; xhr.responseText = JSON.stringify({ secure_url: 'https://evil.test/image.jpg' }); xhr.onload(); }, 'image-upload-response'],
  ]) {
    const h = await harness(simulate);
    await assert.rejects(h.api.uploadImageWithProgress(new File(['test'], 'test.jpg', { type: 'image/jpeg' })), (error) => error.code === code && !error.message.includes('secret-value'));
    assert.equal(h.requests.length, 1); assert.match(h.requests[0].url, /^https:\/\/api.cloudinary.com\//);
  }
});
