import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const fixture = (title = 'Draft') => ({ title, subtitle: 'Subtitle', category: 'EXHIBITION', cover: '', coverMedium: '', contentHTML: '<p>Body</p>' });
function storage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
async function harness() {
  const records = new Map();
  let sequence = 0;
  let offline = false;
  const firestore = {
    collection: (_db, ...parts) => ({ path: parts.join('/') }),
    doc: (first, ...parts) => {
      const path = first?.path ? `${first.path}/${++sequence}` : parts.join('/');
      return { path, id: path.split('/').at(-1) };
    },
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    orderBy: (field, direction) => ({ field, direction }),
    limit: (count) => ({ count }),
    serverTimestamp: () => 'server-time',
    getDocs: async (ref) => {
      if (offline) throw new Error('offline');
      const docs = [...records.entries()].filter(([path]) => path.startsWith(`${ref.path}/`)).map(([path, data]) => ({ id: path.split('/').at(-1), ref: { path }, data: () => data }));
      docs.sort((a, b) => b.data().savedAt - a.data().savedAt);
      return { docs: docs.slice(0, ref.constraints.find((item) => item.count)?.count ?? Infinity) };
    },
    runTransaction: async (_db, callback) => {
      if (offline) throw new Error('offline');
      const writes = [];
      await callback({ get: async (ref) => ({ exists: () => records.has(ref.path) }), set: (ref, data) => writes.push([ref.path, data]) });
      writes.forEach(([path, data]) => records.set(path, data));
    },
    writeBatch: () => {
      const removed = [];
      return { delete: (ref) => removed.push(ref.path), commit: async () => removed.forEach((path) => records.delete(path)) };
    },
  };
  const context = vm.createContext({ TextEncoder, Date, Math, console });
  const module = new vm.SourceTextModule(await readFile(new URL('../src/lib/editorHistory.js', import.meta.url), 'utf8'), { context });
  await module.link(async (specifier) => {
    if (specifier === 'firebase/firestore') return new vm.SyntheticModule(Object.keys(firestore), function () { Object.entries(firestore).forEach(([key, value]) => this.setExport(key, value)); }, { context });
    return new vm.SourceTextModule(await readFile(new URL('../src/constants/categories.js', import.meta.url), 'utf8'), { context });
  });
  await module.evaluate();
  return { api: module.namespace, records, setOffline: (value) => { offline = value; } };
}

test('snapshot preserves intentional empties, strips publication fields, rejects malformed and oversized data', async () => {
  const { api } = await harness();
  const snapshot = api.editorSnapshot({ ...fixture(''), authorEmail: 'owner', status: 'published', views: 90 });
  assert.equal(snapshot.title, '');
  assert.equal(snapshot.status, undefined);
  assert.equal(snapshot.authorEmail, undefined);
  assert.throws(() => api.editorSnapshot({ ...fixture(), category: 'UNKNOWN' }));
  assert.throws(() => api.editorSnapshot({ ...fixture(), title: {} }));
  assert.throws(() => api.editorSnapshot({ ...fixture(), contentHTML: '한'.repeat(240000) }));
});

test('local history is user/document scoped, deduplicated and bounded; restore preserves current draft', async () => {
  const { api } = await harness();
  const local = storage();
  const history = api.createEditorHistory({ userId: 'a', articleId: 'one', storage: local });
  for (let index = 0; index < 35; index++) await history.save(fixture(String(index)));
  const result = await history.list();
  assert.equal(result.items.length, 30);
  assert.equal(result.items[0].snapshot.title, '34');
  await history.save(fixture('34'));
  assert.equal((await history.list()).items.length, 30);
  assert.equal((await api.createEditorHistory({ userId: 'b', articleId: 'one', storage: local }).list()).items.length, 0);
  assert.equal((await api.createEditorHistory({ userId: 'a', articleId: 'two', storage: local }).list()).items.length, 0);
  const restored = history.prepareRestore(result.items[2], fixture('Unsaved'));
  assert.equal(restored.snapshot.title, '32');
  assert.equal(restored.backup.snapshot.title, 'Unsaved');
  assert.equal((await history.list()).items[0].label, '복원 전 내용');
});

test('Firestore history falls back explicitly, retries immutable IDs and prunes excess records', async () => {
  const { api, records, setOffline } = await harness();
  const history = api.createEditorHistory({ db: {}, userId: 'a', ownerEmail: 'owner@example.com', articleId: 'one', storage: storage() });
  setOffline(true);
  const fallback = await history.save(fixture());
  assert.equal(fallback.source, 'local'); assert.ok(fallback.error);
  assert.equal((await history.list()).source, 'local');
  setOffline(false);
  const saved = await history.save(fixture());
  assert.equal(saved.record.id, fallback.record.id);
  await history.save(fixture());
  assert.equal(records.size, 1);
  assert.equal([...records.values()][0].ownerEmail, 'owner@example.com');
  for (let index = 0; index < 50; index++) records.set(`articles/one/history/old-${index}`, { savedAt: index, snapshot: fixture(), label: 'Old' });
  await api.pruneEditorHistory({}, 'one');
  assert.equal(records.size, 30);
});

test('transaction allocation clones data outside retries and writes no article document', async () => {
  const { api } = await harness();
  const original = fixture();
  const allocated = api.allocateEditorHistory({ db: {}, articleId: 'one', userId: 'a', ownerEmail: 'owner@example.com', snapshot: original });
  original.title = 'Changed';
  const writes = [];
  const transaction = { set: (ref, data) => writes.push([ref, data]) };
  api.writeEditorHistory(transaction, allocated);
  api.writeEditorHistory(transaction, allocated);
  assert.equal(writes[0][0], writes[1][0]);
  assert.equal(writes[0][1].snapshot.title, 'Draft');
  assert.equal(writes[0][0].path.startsWith('articles/one/history/'), true);
  assert.equal(writes[0][1].ownerEmail, 'owner@example.com');
  assert.throws(() => api.allocateEditorHistory({ db: {}, articleId: 'one', userId: 'a', snapshot: fixture() }));
});

test('successful server list merges local safety backups without duplicates or retention truncation', async () => {
  const { api, records } = await harness();
  const local = storage();
  const history = api.createEditorHistory({ db: {}, userId: 'a', ownerEmail: 'owner@example.com', articleId: 'one', storage: local });
  const saved = await history.save(fixture('Saved'));
  const selected = (await history.list()).items[0];
  assert.equal(selected.localOnly, false);
  const restored = history.prepareRestore(selected, fixture('Unsaved before restore'));
  for (let index = 0; index < 29; index++) records.set(`articles/one/history/server-${index}`, { savedAt: Date.now() + 1000 + index, snapshot: fixture(`Server ${index}`), label: '발행' });
  const result = await history.list();
  assert.equal(result.source, 'firestore');
  assert.equal(result.items.length, 31);
  assert.equal(result.items.filter((item) => item.id === saved.record.id).length, 1);
  const safety = result.items.find((item) => item.id === restored.backup.id);
  assert.equal(safety.localOnly, true);
  assert.equal(safety.label, '복원 전 내용');
  assert.equal(safety.snapshot.title, 'Unsaved before restore');
  assert.equal((await api.createEditorHistory({ db: {}, userId: 'b', articleId: 'one', storage: local }).list()).items.some((item) => item.id === restored.backup.id), false);
});

test('corrupt local history does not hide readable server history', async () => {
  const { api } = await harness();
  const local = storage();
  const history = api.createEditorHistory({ db: {}, userId: 'a', ownerEmail: 'owner@example.com', articleId: 'one', storage: local });
  await history.save(fixture());
  const key = [...local.values.keys()][0];
  local.setItem(key, '{bad json');
  const result = await history.list();
  assert.equal(result.source, 'firestore');
  assert.equal(result.items.length, 1);
  assert.ok(result.error);
  assert.equal(local.getItem(key), '{bad json');
});

test('template backup restore preserves current metadata and HTML before switching and can be restored again', async () => {
  const { api } = await harness();
  const local = storage();
  const templates = api.createEditorTemplates({ userId: 'a', storage: local });
  const original = { ...fixture('Original'), cover: 'original.jpg', subtitle: 'Original subtitle' };
  templates.prepareApply(api.BUILT_IN_TEMPLATES[0], original);
  const current = { ...fixture('Template edits'), contentHTML: '<p>New edits</p>' };
  const restored = templates.prepareRestoreBackup(current);
  assert.equal(restored.snapshot.title, original.title);
  assert.equal(restored.snapshot.cover, original.cover);
  assert.equal(restored.snapshot.subtitle, original.subtitle);
  assert.equal(templates.readBackup().snapshot.title, current.title);
  const redo = templates.prepareRestoreBackup(original);
  assert.equal(redo.snapshot.contentHTML, current.contentHTML);
  assert.equal(api.createEditorTemplates({ userId: 'b', storage: local }).readBackup(), null);
  assert.throws(() => templates.prepareRestoreBackup({ ...fixture(), title: {} }));
  assert.equal(templates.readBackup().snapshot.title, original.title);
  const blocked = { getItem: (key) => local.getItem(key), setItem: () => { throw new Error('quota'); } };
  assert.throws(() => api.createEditorTemplates({ userId: 'a', storage: blocked }).prepareRestoreBackup(current));
  assert.equal(templates.readBackup().snapshot.title, original.title);
});

test('templates include built-ins, validate names, isolate users, enforce bounds and preserve an apply backup', async () => {
  const { api } = await harness();
  const local = storage();
  const templates = api.createEditorTemplates({ userId: 'a', storage: local });
  assert.equal(templates.list().length, 3);
  const saved = templates.save(' My layout ', fixture());
  assert.equal(saved.name, 'My layout');
  assert.equal(api.createEditorTemplates({ userId: 'b', storage: local }).list().length, 3);
  assert.throws(() => templates.save(' ', fixture()));
  assert.throws(() => templates.save('x'.repeat(81), fixture()));
  assert.throws(() => templates.remove('builtin-review'));
  const applied = templates.prepareApply(saved, fixture('Unsaved'));
  assert.equal(applied.snapshot.title, 'Draft');
  assert.equal(templates.readBackup().snapshot.title, 'Unsaved');
  for (let index = 0; index < 19; index++) templates.save(`Layout ${index}`, fixture());
  assert.throws(() => templates.save('Overflow', fixture()));
  templates.remove(saved.id);
  assert.equal(templates.list().length, 22);
  const builtin = templates.list()[0];
  builtin.snapshot.title = 'Mutation';
  assert.equal(templates.list()[0].snapshot.title, '');
});

test('corrupt or unavailable storage never silently overwrites backups or allows restore', async () => {
  const { api } = await harness();
  const local = storage();
  const templates = api.createEditorTemplates({ userId: 'a', storage: local });
  templates.save('Layout', fixture());
  const key = [...local.values.keys()][0];
  local.setItem(key, '{bad json');
  assert.throws(() => templates.list());
  assert.throws(() => templates.save('New', fixture()));
  assert.equal(local.getItem(key), '{bad json');
  const blocked = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => api.createEditorTemplates({ userId: 'a', storage: blocked }).prepareApply(api.BUILT_IN_TEMPLATES[0], fixture()));
  const history = api.createEditorHistory({ userId: 'a', articleId: 'one', storage: blocked });
  assert.throws(() => history.prepareRestore({ id: 'old', savedAt: 1, label: 'Old', snapshot: fixture() }, fixture('Unsaved')));
  await assert.rejects(() => history.save(fixture()));
  assert.throws(() => api.createEditorTemplates({ userId: '', storage: local }));
  assert.throws(() => api.createEditorHistory({ userId: 'a', articleId: 'bad/id', storage: local }));
});
