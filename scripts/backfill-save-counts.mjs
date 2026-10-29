// Counts existing reader saves (users/{uid}/saved/{editionNo}) into each published article's `saves`.
//   node scripts/backfill-save-counts.mjs          -> audit only, writes nothing
//   node scripts/backfill-save-counts.mjs apply    -> writes the counts
// Needs FIREBASE_CLI_AUTH_MODULE (see docs/operations.md) and a signed-in Firebase CLI account.
// Run once after deploying the rules that add the save counter; rerunning recounts from scratch.
import { documentId, fieldsOf, firestoreApi, listDocuments, patchFields } from './lib/firestoreRest.mjs';

const api = firestoreApi('uarchive-8e437');
const apply = process.argv[2] === 'apply';

const counts = new Map();
let users = 0;
for await (const user of listDocuments(api, 'users')) {
  users += 1;
  for await (const saved of listDocuments(api, `users/${documentId(user)}/saved`)) {
    const editionNo = String(fieldsOf(saved).editionNo || documentId(saved));
    counts.set(editionNo, (counts.get(editionNo) || 0) + 1);
  }
}

const articles = [];
for await (const document of listDocuments(api, 'articles')) {
  const data = fieldsOf(document);
  if (data.status !== 'published' || !data.editionNo) continue;
  const saves = counts.get(String(data.editionNo)) || 0;
  articles.push({ editionNo: data.editionNo, before: data.saves ?? null, saves });
  if (apply) await patchFields(api, `articles/${documentId(document)}`, { saves });
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'audit', users, articles }, null, 2));
