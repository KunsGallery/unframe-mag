import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export function firestoreApi(project) {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
}

let cachedToken = null;
async function token() {
  if (cachedToken) return cachedToken;
  const modulePath = process.env.FIREBASE_CLI_AUTH_MODULE;
  if (!modulePath) throw new Error('Set FIREBASE_CLI_AUTH_MODULE to your installed firebase-tools/lib/auth.js. Tokens are never printed or stored.');
  const auth = require(path.resolve(modulePath));
  cachedToken = (await auth.getAccessToken(auth.getGlobalDefaultAccount()?.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform'])).access_token;
  return cachedToken;
}

export async function firestore(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(`Firestore ${response.status}: ${result.error?.message || 'request failed'}`), { code: result.error?.status });
  return result;
}

export async function* listDocuments(api, collectionPath) {
  let pageToken = '';
  do {
    const page = await firestore(`${api}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    for (const document of page.documents || []) yield document;
    pageToken = page.nextPageToken || '';
  } while (pageToken);
}

export function decode(field) {
  if (!field) return null;
  if ('mapValue' in field) return Object.fromEntries(Object.entries(field.mapValue.fields || {}).map(([key, value]) => [key, decode(value)]));
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(decode);
  if ('integerValue' in field || 'doubleValue' in field) return Number(field.integerValue ?? field.doubleValue);
  return field.stringValue ?? field.booleanValue ?? field.timestampValue ?? null;
}

export function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
  return { stringValue: String(value) };
}

export function fieldsOf(document) {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, decode(value)]));
}

export function documentId(document) {
  return document.name.split('/').pop();
}

// Writes only the named fields; a named field missing from `values` is removed.
export function patchFields(api, documentPath, values, fieldPaths = Object.keys(values)) {
  const mask = fieldPaths.map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');
  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, encode(value)]));
  return firestore(`${api}/${documentPath}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
}
