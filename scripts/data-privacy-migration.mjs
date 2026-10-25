// One-off cleanup for data written before the 2026-10 privacy and home summary changes.
//   node scripts/data-privacy-migration.mjs          -> audit only, writes nothing
//   node scripts/data-privacy-migration.mjs apply    -> applies the changes
// Needs FIREBASE_CLI_AUTH_MODULE (see docs/operations.md) and a signed-in Firebase CLI account.
import { isAdminEmail } from '../src/constants/admin.js';
import { buildArticleSummary } from '../src/lib/articleSummary.js';
import { documentId, fieldsOf, firestoreApi, listDocuments, patchFields } from './lib/firestoreRest.mjs';

const api = firestoreApi('uarchive-8e437');
const apply = process.argv[2] === 'apply';
const STAFF_ROLES = new Set(['editor', 'admin']);
const report = { users: 0, publicEmailsRemoved: 0, staffEmailsKept: 0, comments: 0, commentEmailsRemoved: 0, published: 0, summariesWritten: 0 };

for await (const document of listDocuments(api, 'users')) {
  report.users += 1;
  const uid = documentId(document);
  const data = fieldsOf(document);
  if (!data.email) continue;
  if (STAFF_ROLES.has(String(data.role || '')) || isAdminEmail(data.email)) {
    report.staffEmailsKept += 1;
    continue;
  }
  report.publicEmailsRemoved += 1;
  if (!apply) continue;
  // Keep the address for admins, then remove it from the public profile.
  await patchFields(api, `users/${uid}/private/contact`, { email: data.email, updatedAt: new Date() });
  await patchFields(api, `users/${uid}`, {}, ['email']);
}

for await (const document of listDocuments(api, 'comments')) {
  report.comments += 1;
  const data = fieldsOf(document);
  if (!('authorEmail' in data)) continue;
  report.commentEmailsRemoved += 1;
  if (!apply) continue;
  await patchFields(api, `comments/${documentId(document)}`, { authorIsAdmin: isAdminEmail(data.authorEmail) }, ['authorIsAdmin', 'authorEmail']);
}

for await (const document of listDocuments(api, 'articles')) {
  const data = fieldsOf(document);
  if (data.status !== 'published') continue;
  report.published += 1;
  report.summariesWritten += 1;
  if (!apply) continue;
  await patchFields(api, `articleSummaries/${documentId(document)}`, buildArticleSummary(data, new Date()));
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'audit', ...report }, null, 2));
