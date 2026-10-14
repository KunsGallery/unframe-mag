import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, deleteDoc, getDoc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { runPublicationTransaction } from "../src/lib/publicationTransaction.js";

let environment;
const projectId = "demo-unframe-rules";
const user = (uid, email = `${uid}@example.com`, verified = true) => environment.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const published = { status: "published", authorEmail: "editor@example.com", editionNo: "006", sortIndex: 6, title: "Published", contentHTML: "<p>Body</p>", likes: 0, views: 0 };

before(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  assert.ok(host, "Run this test only against a local Firestore emulator.");
  const [hostname, port] = host.split(":");
  environment = await initializeTestEnvironment({ projectId, firestore: { host: hostname, port: Number(port), rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") } });
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "editor"), { role: "editor", nickname: "Editor", nicknameChanged: false, xp: 0 });
    await setDoc(doc(db, "users", "reader"), { role: "user", nickname: "Reader", nicknameChanged: false, xp: 0 });
    await setDoc(doc(db, "articles", "existing"), published);
    await setDoc(doc(db, "counters", "articles"), { lastIndex: 6, articleId: "existing", updatedAt: serverTimestamp() });
  });
});
after(async () => { await environment?.cleanup(); });

test("profile changes cannot add or change privileges, including through nickname changes", async () => {
  const db = user("reader");
  await assertFails(updateDoc(doc(db, "users", "reader"), { role: "editor", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, "users", "reader"), { nickname: "New", nicknameChanged: true, role: "admin" }));
  await assertFails(updateDoc(doc(db, "users", "reader"), { canWrite: true, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, "users", "reader"), { photoURL: "https://example.com/profile.webp", updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(db, "users", "reader"), { nickname: "New", nicknameChanged: true, displayName: "New", name: "New", updatedAt: serverTimestamp() }));
});

test("public article metrics cannot alter editorial identity or jump counts", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "articles", "existing")));
  await assertSucceeds(updateDoc(doc(db, "articles", "existing"), { views: increment(1) }));
  await assertFails(updateDoc(doc(db, "articles", "existing"), { title: "Overwrite", views: increment(1) }));
  await assertFails(updateDoc(doc(db, "articles", "existing"), { authorEmail: "attacker@example.com", views: increment(1) }));
  await assertFails(updateDoc(doc(db, "articles", "existing"), { likes: increment(100) }));
});

test("concurrent publications allocate unique server-validated editions", async () => {
  const db = user("editor");
  const counter = doc(db, "counters", "articles");
  await Promise.all(["new-a", "new-b"].map((id) => runPublicationTransaction(db, counter, async (transaction, noteCounterRead) => {
    const snap = await transaction.get(counter);
    noteCounterRead(snap.data().lastIndex);
    const next = snap.data().lastIndex + 1;
    transaction.set(counter, { lastIndex: next, articleId: id, updatedAt: serverTimestamp() });
    transaction.set(doc(db, "articles", id), { ...published, sortIndex: next, editionNo: String(next).padStart(3, "0") });
  })));
  const a = (await getDoc(doc(db, "articles", "new-a"))).data();
  const b = (await getDoc(doc(db, "articles", "new-b"))).data();
  assert.deepEqual([a.sortIndex, b.sortIndex].sort(), [7, 8]);
  assert.notEqual(a.editionNo, b.editionNo);
  await assertFails(setDoc(doc(db, "articles", "duplicate"), { ...published, editionNo: "007", sortIndex: 7 }));
  await assertFails(updateDoc(doc(db, "articles", "existing"), { editionNo: "099", sortIndex: 99 }));
});

test("revision commit preserves edition and removes only the editor's own draft", async () => {
  const db = user("editor");
  const draftRef = doc(db, "articles", "revision");
  await assertSucceeds(setDoc(draftRef, { status: "draft", authorEmail: "editor@example.com", sourceArticleId: "existing", title: "Revision" }));
  const batch = writeBatch(db);
  batch.update(doc(db, "articles", "existing"), { title: "Revised", contentHTML: "<p>Revision</p>" });
  batch.delete(draftRef);
  await assertSucceeds(batch.commit());
  await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "articles", "other-draft"), { status: "draft", authorEmail: "someone@example.com" }));
  await assertFails(updateDoc(doc(db, "articles", "other-draft"), { title: "Not mine" }));
  await assertFails(deleteDoc(doc(db, "articles", "other-draft")));
});

test("only verified configured administrators may save website links", async () => {
  await assertFails(setDoc(doc(user("reader"), "config", "network"), { newsletterUrl: "https://example.com/signup" }));
  await assertFails(setDoc(doc(user("fake-admin", "gallerykuns@gmail.com", false), "config", "network"), { newsletterUrl: "https://example.com/signup" }));
  await assertSucceeds(setDoc(doc(user("admin", "gallerykuns@gmail.com"), "config", "network"), { newsletterUrl: "https://example.com/signup" }));
});

test("revision history stays private, immutable and bound to the article owner", async () => {
  const db = user('editor');
  const ref = doc(db, 'articles', 'existing', 'history', 'own-version');
  const record = { version: 1, userId: 'editor', ownerEmail: 'editor@example.com', label: '저장', savedAt: Date.now(), createdAt: serverTimestamp(), snapshot: { title: '기록', subtitle: '', category: 'EXHIBITION', cover: '', coverMedium: '', contentHTML: '<p>기록</p>' } };
  await assertSucceeds(setDoc(ref, record));
  await assertSucceeds(getDoc(ref));
  await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), 'articles', 'existing', 'history', 'own-version')));
  await assertFails(getDoc(doc(user('reader'), 'articles', 'existing', 'history', 'own-version')));
  await assertFails(setDoc(doc(db, 'articles', 'existing', 'history', 'wrong-owner'), { ...record, ownerEmail: 'someone@example.com' }));
  await assertFails(setDoc(doc(db, 'articles', 'existing', 'history', 'wrong-actor'), { ...record, userId: 'reader' }));
  await assertFails(updateDoc(ref, { label: 'Overwrite' }));
  await assertSucceeds(getDoc(doc(user('admin', 'gallerykuns@gmail.com'), 'articles', 'existing', 'history', 'own-version')));
  const batch = writeBatch(db);
  batch.set(doc(db, 'articles', 'history-new-draft'), { status: 'draft', authorEmail: 'editor@example.com', title: 'New' });
  batch.set(doc(db, 'articles', 'history-new-draft', 'history', 'first'), record);
  await assertSucceeds(batch.commit());
});
