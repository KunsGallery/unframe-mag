import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, deleteDoc, deleteField, getDoc, increment, serverTimestamp, writeBatch } from "firebase/firestore";
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
    const article = { ...published, sortIndex: next, editionNo: String(next).padStart(3, "0") };
    transaction.set(doc(db, "articles", id), article);
    transaction.set(doc(db, "articleSummaries", id), { editionNo: article.editionNo, sortIndex: next, title: article.title, readMinutes: 2, updatedAt: serverTimestamp() });
  })));
  assert.equal((await getDoc(doc(db, "articleSummaries", "new-a"))).data().title, "Published");
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

test("public profiles never gain a reader's email; contacts stay private", async () => {
  const db = user("fresh");
  await assertFails(setDoc(doc(db, "users", "fresh"), { nickname: "Fresh", nicknameChanged: false, role: "user", email: "fresh@example.com" }));
  await assertSucceeds(setDoc(doc(db, "users", "fresh"), { nickname: "Fresh", nicknameChanged: false, role: "user" }));
  await assertFails(updateDoc(doc(db, "users", "fresh"), { email: "fresh@example.com", updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(user("editor", "editor@example.com"), "users", "editor"), { email: "editor@example.com", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(user("editor", "editor@example.com"), "users", "editor"), { email: "other@example.com", updatedAt: serverTimestamp() }));

  const contact = doc(db, "users", "fresh", "private", "contact");
  await assertFails(setDoc(contact, { email: "someone-else@example.com", updatedAt: serverTimestamp() }));
  await assertSucceeds(setDoc(contact, { email: "fresh@example.com", updatedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(contact));
  await assertFails(getDoc(doc(user("reader"), "users", "fresh", "private", "contact")));
  await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "users", "fresh", "private", "contact")));
  await assertSucceeds(getDoc(doc(user("admin", "gallerykuns@gmail.com"), "users", "fresh", "private", "contact")));

  await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "users", "legacy"), { nickname: "Legacy", nicknameChanged: false, role: "user", email: "legacy@example.com" }));
  await assertSucceeds(updateDoc(doc(user("legacy", "legacy@example.com"), "users", "legacy"), { email: deleteField(), updatedAt: serverTimestamp() }));
});

test("progress fields move in small, consistent steps", async () => {
  const db = user("reader");
  const ref = doc(db, "users", "reader");
  await assertFails(updateDoc(ref, { xp: 999999, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { commentCount: 100, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { xp: 6, level: 50, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { xp: 6, tier: "DIAMOND", updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { xp: 6, level: 1, tier: "ROOKIE", tierLabel: "Rookie", tierColor: "#9CA3AF", commentCount: 1, lastVisitDate: "20261025", streakCount: 1, visitDayCount: 1, updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, "users", "reader", "achievements", "comments_100"), { achievementId: "comments_100" }));
  await assertSucceeds(setDoc(doc(db, "users", "reader", "achievements", "ach_first_comment"), { achievementId: "ach_first_comment" }));
});

test("a like moves the counter only with the reader's own like record", async () => {
  const db = user("reader");
  const article = doc(db, "articles", "existing");
  const like = doc(db, "articles", "existing", "likes", "reader");
  await assertFails(updateDoc(article, { likes: increment(1) }));
  await assertFails(updateDoc(doc(environment.unauthenticatedContext().firestore(), "articles", "existing"), { likes: increment(1) }));
  const add = writeBatch(db);
  add.set(like, { createdAt: serverTimestamp() });
  add.update(article, { likes: increment(1) });
  await assertSucceeds(add.commit());
  const again = writeBatch(db);
  again.set(like, { createdAt: serverTimestamp() });
  again.update(article, { likes: increment(1) });
  await assertFails(again.commit());
  const remove = writeBatch(db);
  remove.delete(like);
  remove.update(article, { likes: increment(-1) });
  await assertSucceeds(remove.commit());
});

test("comments are bound to their author and never carry an email", async () => {
  const db = user("reader");
  const base = { editionNo: "006", text: "좋아요", nickname: "Reader", author: "Reader", authorUid: "reader", authorIsAdmin: false, createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db, "comments", "ok"), base));
  await assertFails(setDoc(doc(db, "comments", "with-email"), { ...base, authorEmail: "reader@example.com" }));
  await assertFails(setDoc(doc(db, "comments", "spoof"), { ...base, authorUid: "editor" }));
  const { authorUid: _omitted, ...withoutUid } = base;
  await assertFails(setDoc(doc(db, "comments", "no-uid"), withoutUid));
  await assertFails(setDoc(doc(db, "comments", "fake-admin"), { ...base, authorIsAdmin: true }));
});

test("home summaries follow their published article", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "articles", "summary-source"), { ...published, editionNo: "005", sortIndex: 5, title: "Summary source" });
    await setDoc(doc(context.firestore(), "articles", "summary-draft"), { status: "draft", authorEmail: "editor@example.com", title: "Draft" });
  });
  const db = user("editor");
  const summary = { editionNo: "005", sortIndex: 5, title: "Summary source", readMinutes: 2, updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db, "articleSummaries", "summary-source"), summary));
  await assertFails(setDoc(doc(db, "articleSummaries", "summary-source"), { ...summary, editionNo: "099" }));
  await assertFails(setDoc(doc(db, "articleSummaries", "summary-source"), { ...summary, title: "Different" }));
  await assertFails(setDoc(doc(db, "articleSummaries", "summary-source"), { ...summary, contentHTML: "<p>Body</p>" }));
  await assertSucceeds(setDoc(doc(db, "articleSummaries", "summary-source"), { ...summary, relatedEditionNos: ["001", "002"] }));
  await assertFails(setDoc(doc(db, "articleSummaries", "summary-source"), { ...summary, relatedEditionNos: Array.from({ length: 13 }, (_, index) => String(index)) }));
  await assertSucceeds(setDoc(doc(db, "articleSummaries", "summary-source"), { ...summary, tags: ["회화", "단체전"] }));
  await assertFails(setDoc(doc(db, "articleSummaries", "summary-source"), { ...summary, tags: Array.from({ length: 11 }, (_, index) => `t${index}`) }));
  await assertFails(setDoc(doc(db, "articleSummaries", "summary-draft"), { ...summary, title: "Draft" }));
  await assertFails(setDoc(doc(user("reader"), "articleSummaries", "summary-source"), summary));
  await assertSucceeds(getDoc(doc(environment.unauthenticatedContext().firestore(), "articleSummaries", "summary-source")));
});

test("poll votes and daily stats accept only their own fields", async () => {
  const db = user("reader");
  await assertFails(setDoc(doc(db, "polls", "p1", "votes", "reader"), { optionId: "a", uid: "reader", xp: 999, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, "polls", "p1", "votes", "reader"), { optionId: "x".repeat(65), uid: "reader", createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, "polls", "p1", "votes", "reader"), { optionId: "a", uid: "editor", createdAt: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(db, "polls", "p1", "votes", "reader"), { optionId: "a", uid: "reader", createdAt: serverTimestamp() }));
  const day = doc(db, "users", "reader", "daily", "20261025");
  await assertFails(setDoc(day, { views: increment(1), note: "extra" }, { merge: true }));
  await assertSucceeds(setDoc(day, { views: increment(1), updatedAt: serverTimestamp(), bucket: "evening", weekend: true }, { merge: true }));
});
