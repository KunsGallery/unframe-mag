import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { draftSnapshot, readRecovery, recoveryKey, writeRecovery } from '../src/lib/draftRecovery.js';

const source = await readFile(new URL('../src/hooks/useDrafts.js', import.meta.url), 'utf8');
const recoverySource = await readFile(new URL('../src/lib/draftRecovery.js', import.meta.url), 'utf8');
const publicationSource = await readFile(new URL('../src/lib/publicationTransaction.js', import.meta.url), 'utf8');
const historySource = await readFile(new URL('../src/lib/editorHistory.js', import.meta.url), 'utf8');
const categoriesSource = await readFile(new URL('../src/constants/categories.js', import.meta.url), 'utf8');
const summarySource = await readFile(new URL('../src/lib/articleSummary.js', import.meta.url), 'utf8');
const readingMetaSource = await readFile(new URL('../src/lib/readingMeta.js', import.meta.url), 'utf8');
const meta = { title: '', subtitle: '', category: 'ART', cover: '', coverMedium: '', authorEmail: 'author@example.com' };
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
const memoryStorage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key), data };
};
const snapshot = (data, id) => ({ id, exists: () => data !== undefined, data: () => data && structuredClone(data) });

// Optimistic retries and staged writes model the Firestore transaction contract,
// including the Web SDK's document-only reads and read-before-write requirement.
function backend(initial = {}, { permissionConflicts = false, failHistory = false } = {}) {
  const data = new Map(Object.entries(initial));
  const versions = new Map();
  const commits = [];
  const attempts = [];
  let serial = 0;
  let retries = 0;
  const firestore = {
    collection: (_db, ...parts) => ({ collection: parts.join('/') }),
    query: (collection, ...clauses) => ({ collection: collection.collection, clauses }),
    orderBy: (field, direction) => ({ order: field, direction }),
    limit: (value) => ({ limit: value }),
    where: (field, _operator, value) => ({ field, value }),
    doc: (dbOrCollection, ...parts) => {
      const path = dbOrCollection.collection ? dbOrCollection.collection + '/auto-' + (++serial) : parts.join('/');
      return { id: path.split('/').at(-1), path };
    },
    getDocs: async (query) => {
      let docs = [...data].filter(([key, value]) => key.startsWith(query.collection + '/') && key.split('/').length === query.collection.split('/').length + 1 &&
        query.clauses.every((clause) => !clause.field || value[clause.field] === clause.value));
      const order = query.clauses.find((clause) => clause.order);
      if (order) docs.sort((a, b) => (b[1][order.order] || 0) - (a[1][order.order] || 0));
      const cap = query.clauses.find((clause) => clause.limit);
      if (cap) docs = docs.slice(0, cap.limit);
      return { docs: docs.map(([key, value]) => ({ ...snapshot(value, key.split('/').at(-1)), ref: { path: key } })), empty: !docs.length };
    },
    getDoc: async (ref) => snapshot(data.get(ref.path), ref.id),
    serverTimestamp: () => 123,
    writeBatch: () => {
      const removed = [];
      return { delete: (ref) => removed.push(ref.path), commit: async () => removed.forEach((path) => data.delete(path)) };
    },
    runTransaction: async (_db, callback) => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const reads = new Map();
        const writes = [];
        const transaction = {
          get: async (ref) => {
            assert.equal(writes.length, 0, 'all document reads precede writes');
            assert.ok(ref.path, 'transaction reads require document refs');
            reads.set(ref.path, versions.get(ref.path) || 0);
            return snapshot(data.get(ref.path), ref.id);
          },
          set: (ref, value) => {
            if (failHistory && ref.path.includes('/history/')) throw new Error('History write denied');
            writes.push({ type: 'set', ref, value: structuredClone(value) });
          },
          update: (ref, value) => writes.push({ type: 'update', ref, value: structuredClone(value) }),
          delete: (ref) => writes.push({ type: 'delete', ref }),
        };
        const result = await callback(transaction);
        attempts.push(writes);
        if ([...reads].some(([key, version]) => (versions.get(key) || 0) !== version)) {
          retries++;
          if (permissionConflicts) throw Object.assign(new Error('stale counter denied by rules'), { code: 'permission-denied' });
          continue;
        }
        for (const write of writes) {
          const { ref, value, type } = write;
          if (type === 'delete') data.delete(ref.path);
          else data.set(ref.path, type === 'update' ? { ...data.get(ref.path), ...value } : value);
          versions.set(ref.path, (versions.get(ref.path) || 0) + 1);
        }
        commits.push(writes);
        return result;
      }
      throw new Error('retry limit');
    },
  };
  return { firestore, data, commits, attempts, get retries() { return retries; }, get allocatedRefs() { return serial; } };
}

async function harness({ overrides = {}, server = backend(), storage = memoryStorage(), initialProps = {} } = {}) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  const timers = new Map();
  const frames = [];
  const navigations = [];
  const navigationDirty = [];
  let latestApi;
  const toasts = [];
  const editor = {
    isInitialized: true, isDestroyed: false, isEmpty: false, html: '<img src="image.jpg">',
    getHTML: () => editor.html, getText: () => '',
    commands: { setContent: (html, options) => { assert.equal(options.emitUpdate, false); editor.html = html; } },
  };
  const changed = (a, b) => !a || b.some((value, i) => !Object.is(value, a[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(fn, dependencies) {
      const index = cursor++;
      if (changed(slots[index]?.dependencies, dependencies)) slots[index] = { fn, dependencies };
      return slots[index].fn;
    },
    useEffect(fn, dependencies) {
      const index = cursor++;
      if (changed(slots[index]?.dependencies, dependencies)) {
        const previous = slots[index];
        slots[index] = { dependencies, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = fn(); });
      }
    },
  };
  const context = createContext({
    TextEncoder,
    console: { log() {}, error() {} },
    setTimeout(fn, delay) { const id = Symbol(); timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    window: { localStorage: storage, requestAnimationFrame: (fn) => frames.push(fn) },
  });
  const module = new SourceTextModule(source, { context });
  const recoveryModule = new SourceTextModule(recoverySource, { context });
  await recoveryModule.link(() => {});
  await recoveryModule.evaluate();
  const publicationModule = new SourceTextModule(publicationSource, { context });
  await publicationModule.link(() => {
    const exports = { ...server.firestore, ...overrides };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await publicationModule.evaluate();
  const categoriesModule = new SourceTextModule(categoriesSource, { context });
  await categoriesModule.link(() => {});
  const historyModule = new SourceTextModule(historySource, { context });
  await historyModule.link((specifier) => {
    if (specifier.includes('categories')) return categoriesModule;
    const exports = { ...server.firestore, ...overrides };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await historyModule.evaluate();
  const readingMetaModule = new SourceTextModule(readingMetaSource, { context });
  await readingMetaModule.link(() => {});
  const summaryModule = new SourceTextModule(summarySource, { context });
  await summaryModule.link(() => readingMetaModule);
  await summaryModule.evaluate();
  await module.link((specifier) => {
    if (specifier.includes('articleSummary')) return summaryModule;
    if (specifier.includes('draftRecovery')) return recoveryModule;
    if (specifier.includes('publicationTransaction')) return publicationModule;
    if (specifier.includes('editorHistory')) return historyModule;
    const exports = specifier === 'react' ? react
      : specifier === 'firebase/firestore' ? { ...server.firestore, ...overrides }
        : { DEFAULT_ARTICLE_CATEGORY: 'ART' };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  let props = { db: {}, editor, canWrite: true, authorEmail: meta.authorEmail,
    onToast: (message) => toasts.push(message), navigate: (path) => {
      navigationDirty.push(latestApi.hasUnsavedChanges());
      navigations.push(path);
    }, ...initialProps };
  const render = (updates = {}) => {
    props = { ...props, ...updates };
    cursor = 0;
    const api = module.namespace.useDrafts(props);
    latestApi = api;
    for (const effect of effects.splice(0)) effect();
    return api;
  };
  const applied = {};
  const setters = Object.fromEntries(['Title', 'Subtitle', 'Category', 'Cover', 'CoverMedium'].map((key) => [
    'set' + key, (value) => { applied[key] = value; },
  ]));
  render();
  return {
    render, editor, timers, frames, server, storage, navigations, navigationDirty, toasts, applied, setters,
    runPublicationTransaction: publicationModule.namespace.runPublicationTransaction,
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    async fireAutosave() {
      assert.equal(timers.size, 1);
      const [id, { fn, delay }] = timers.entries().next().value;
      assert.equal(delay, 30000);
      timers.delete(id);
      await fn();
    },
  };
}

test('failed autosave retains recovery, dirty state and the previous save timestamp', async () => {
  const h = await harness({ overrides: { runTransaction: async () => { throw new Error('offline'); } } });
  h.render().setLastAutoSavedAt(42);
  h.render().setIsDirty(true);
  h.render().runAutosave(meta);
  await h.fireAutosave();
  assert.equal(h.render().lastAutoSavedAt, 42);
  assert.equal(h.render().isDirty, true);
  assert.ok(readRecovery(h.storage, recoveryKey(meta.authorEmail)));
  assert.equal(await h.render().saveDraft({}, meta), false);
  assert.equal(h.render().isSaving, false);
  h.unmount();
});

test('null-to-editor mount refreshes drafts after editor cleanup invalidates the initial pending list', async () => {
  const requests = [];
  const h = await harness({ initialProps: { editor: null }, overrides: {
    getDocs: async () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    },
  } });
  assert.equal(requests.length, 1);
  h.render({ editor: h.editor });
  assert.equal(requests.length, 2, 'editor arrival starts a fresh list request');
  requests[1].resolve({ docs: [snapshot({ title: 'Current draft', status: 'draft' }, 'current')] });
  await new Promise(setImmediate);
  assert.equal(h.render().drafts[0]?.id, 'current');
  requests[0].resolve({ docs: [snapshot({ title: 'Stale draft', status: 'draft' }, 'stale')] });
  await new Promise(setImmediate);
  assert.equal(h.render().drafts[0]?.id, 'current', 'initial request cannot replace the fresh list');
  h.unmount();
});

test('manual save and publication update saved status while failed operations preserve its timestamp', async () => {
  for (const publication of [false, true]) {
    let fail = false;
    const server = backend();
    const h = await harness({ server, overrides: {
      runTransaction: async (...args) => {
        if (fail) throw new Error('offline');
        return server.firestore.runTransaction(...args);
      },
    } });
    h.render().setLastAutoSavedAt(42);
    h.render().setIsDirty(true);
    const save = () => publication ? h.render().publish({ ...meta, title: 'Published' }) : h.render().saveDraft({ markClean: true }, meta);
    assert.equal(await save(), true);
    const savedAt = h.render().lastAutoSavedAt;
    assert.equal(typeof savedAt, 'number');
    assert.ok(savedAt > 42);
    fail = true;
    h.render().setIsDirty(true);
    assert.equal(await save(), false);
    assert.equal(h.render().lastAutoSavedAt, savedAt);
    h.unmount();
  }
});

test('continuous typing and metadata changes keep one deadline and save the latest snapshot', async () => {
  const h = await harness();
  h.render().runAutosave(meta);
  const deadline = [...h.timers.keys()][0];
  for (let i = 0; i < 20; i++) {
    h.editor.html = '<p>edit ' + i + '</p>';
    h.render().setIsDirty(true);
    h.render().runAutosave({ ...meta, title: 'Title ' + i });
    assert.equal([...h.timers.keys()][0], deadline);
  }
  await h.fireAutosave();
  const saved = h.server.data.get('articles/' + h.render().draftId);
  assert.equal(saved.title, 'Title 19');
  assert.equal(saved.contentHTML, '<p>edit 19</p>');
  assert.equal(h.render().isDirty, false);
  assert.equal(h.timers.size, 1);
  h.unmount();
  assert.equal(h.timers.size, 0);
});

test('category-only, image-only and intentional empty-document edits are protected and saved', async () => {
  for (const html of ['<img src="photo.jpg">', '<p></p>']) {
    const h = await harness();
    h.editor.html = html;
    h.render().setIsDirty(true);
    h.render().runAutosave({ ...meta, category: 'DESIGN' });
    const local = readRecovery(h.storage, recoveryKey(meta.authorEmail));
    assert.equal(local.snapshot.category, 'DESIGN');
    assert.equal(local.snapshot.contentHTML, html);
    await h.fireAutosave();
    assert.equal(h.render().isDirty, false);
    assert.equal(readRecovery(h.storage, recoveryKey(meta.authorEmail)), null);
    h.unmount();
  }
});

test('typing during an autosave request cannot create a second periodic timer', async () => {
  const pending = deferred();
  const server = backend();
  const h = await harness({ server, overrides: { runTransaction: async (...args) => {
    await pending.promise; return server.firestore.runTransaction(...args);
  } } });
  h.render().setIsDirty(true);
  h.render().runAutosave(meta);
  const saving = h.fireAutosave();
  h.render().setIsDirty(true);
  h.render().runAutosave({ ...meta, title: 'While saving' });
  assert.equal(h.timers.size, 0);
  pending.resolve();
  await saving;
  assert.equal(h.timers.size, 1);
  h.unmount();
});

test('edits during a pending save retain dirty state and migrate recovery to the created document', async () => {
  const pending = deferred();
  const server = backend();
  const h = await harness({ server, overrides: { runTransaction: async (...args) => {
    await pending.promise;
    return server.firestore.runTransaction(...args);
  } } });
  const setter = h.render().setIsDirty;
  setter(true);
  const saving = h.render().saveDraft({ markClean: true }, meta);
  assert.equal(h.render().setIsDirty, setter);
  h.editor.html = '<p>newer</p>';
  setter((previous) => previous);
  h.render().runAutosave({ ...meta, title: 'Newer metadata' });
  pending.resolve();
  assert.equal(await saving, true);
  assert.equal(h.render().isDirty, true);
  const recovery = readRecovery(h.storage, recoveryKey(meta.authorEmail, h.render().draftId));
  assert.equal(recovery.snapshot.title, 'Newer metadata');
  assert.equal(recovery.snapshot.contentHTML, '<p>newer</p>');
  assert.equal(readRecovery(h.storage, recoveryKey(meta.authorEmail)), null);
  h.unmount();
});

test('completion never removes another tab snapshot written after the request started', async () => {
  const pending = deferred();
  const server = backend();
  const h = await harness({ server, overrides: { runTransaction: async (...args) => {
    await pending.promise; return server.firestore.runTransaction(...args);
  } } });
  h.render().setIsDirty(true);
  const saving = h.render().saveDraft({ markClean: true }, meta);
  const record = writeRecovery(h.storage, recoveryKey(meta.authorEmail), draftSnapshot(meta, '<p>other tab</p>'));
  pending.resolve();
  await saving;
  assert.equal(readRecovery(h.storage, recoveryKey(meta.authorEmail)).token, record.token);
});

test('reload of a new editor finds the created document recovery and restores its association locally', async () => {
  const storage = memoryStorage();
  const server = backend();
  const first = await harness({ storage, server });
  first.render().setIsDirty(true);
  await first.render().saveDraft({ markClean: true }, { ...meta, title: 'Saved' });
  const id = first.render().draftId;
  first.editor.html = '<p>unsaved after first save</p>';
  first.render().setIsDirty(true);
  first.render().runAutosave({ ...meta, title: 'Recovered' });
  first.unmount();
  const reloaded = await harness({ storage, server });
  assert.equal(reloaded.render().recovery.snapshot.title, 'Recovered');
  assert.equal(reloaded.render().draftId, null);
  assert.equal(reloaded.render().restoreRecovery(reloaded.setters), true);
  assert.equal(reloaded.render().draftId, id);
  assert.equal(server.data.get('articles/' + id).title, 'Saved');
  assert.equal(await reloaded.render().saveDraft({ markClean: true }, { ...meta, title: 'Recovered' }), true);
  assert.equal(server.data.get('articles/' + id).title, 'Recovered');
  assert.equal(server.allocatedRefs, 2, 'the save allocates a spare ref but does not create a duplicate document');
  assert.equal([...server.data.keys()].filter((key) => key.startsWith('articles/')).length, 1);
});

test('restore is explicit, includes all metadata, and cannot automatically overwrite the server', async () => {
  const storage = memoryStorage();
  const restored = { ...meta, title: 'Recovered', subtitle: 'Sub', category: 'DESIGN', cover: 'a.jpg', coverMedium: 'b.jpg' };
  writeRecovery(storage, recoveryKey(meta.authorEmail), draftSnapshot(restored, '<img src="recovered.jpg">'));
  const h = await harness({ storage });
  assert.ok(h.render().recovery);
  assert.equal(h.editor.html, '<img src="image.jpg">');
  assert.equal(await h.render().saveDraft({}, meta), false);
  assert.equal(h.render().restoreRecovery(h.setters), true);
  assert.equal(h.applied.CoverMedium, 'b.jpg');
  assert.equal(h.applied.Category, 'DESIGN');
  assert.equal(h.editor.html, '<img src="recovered.jpg">');
  h.render().runAutosave(restored);
  await h.fireAutosave();
  assert.equal(h.server.commits.length, 0);
  assert.equal(h.render().isDirty, true);
  assert.equal(h.render().recoveryNeedsSave, true);
  assert.equal(await h.render().saveDraft({ markClean: true }, restored), true);
  assert.equal(h.render().recoveryNeedsSave, false);
  h.unmount();
});

test('discard removes only the offered local snapshot and performs no server write', async () => {
  const storage = memoryStorage();
  writeRecovery(storage, recoveryKey(meta.authorEmail), draftSnapshot(meta, '<p>old</p>'));
  const h = await harness({ storage });
  assert.equal(h.render().discardRecovery(), true);
  assert.equal(h.render().recovery, null);
  assert.equal(h.storage.data.size, 0);
  assert.equal(h.server.commits.length, 0);
});

test('stale restore and discard refresh the offer rather than overwriting newer local edits', async () => {
  const storage = memoryStorage();
  writeRecovery(storage, recoveryKey(meta.authorEmail), draftSnapshot(meta, '<p>old</p>'));
  const h = await harness({ storage });
  const newer = writeRecovery(storage, recoveryKey(meta.authorEmail), draftSnapshot(meta, '<p>new tab</p>'));
  assert.equal(h.render().restoreRecovery(h.setters), false);
  assert.equal(h.render().recovery.token, newer.token);
  const newest = writeRecovery(storage, recoveryKey(meta.authorEmail), draftSnapshot(meta, '<p>newest</p>'));
  assert.equal(h.render().discardRecovery(), false);
  assert.equal(h.render().recovery.token, newest.token);
});

test('latest load wins; stale requests and edits during loading cannot replace the editor', async () => {
  const a = deferred();
  const b = deferred();
  const h = await harness({ overrides: { getDoc: ({ id }) => id === 'a' ? a.promise : b.promise } });
  const loadingA = h.render().loadDraft('a', h.setters);
  const loadingB = h.render().loadDraft('b', h.setters);
  a.resolve(snapshot({ title: 'A', authorEmail: meta.authorEmail }));
  assert.equal(await loadingA, false);
  assert.equal(h.render().isDraftLoading, true);
  b.resolve(snapshot({ title: 'B', authorEmail: meta.authorEmail, contentHTML: '<p>B</p>' }));
  assert.equal(await loadingB, true);
  assert.equal(h.render().draftId, 'b');
  const waiting = deferred();
  const edited = await harness({ overrides: { getDoc: () => waiting.promise } });
  const loading = edited.render().loadDraft('c', edited.setters);
  edited.render().setIsDirty(true);
  waiting.resolve(snapshot({ authorEmail: meta.authorEmail, contentHTML: '<p>server</p>' }));
  assert.equal(await loading, false);
  assert.equal(edited.editor.html, '<img src="image.jpg">');
});

test('load waits for readiness; New invalidates the waiting request', async () => {
  const h = await harness({ server: backend({ 'articles/old': { authorEmail: meta.authorEmail } }) });
  h.editor.isInitialized = false;
  const loading = h.render().loadDraft('old', h.setters);
  await Promise.resolve();
  h.render().startNewDraft(h.setters);
  for (const frame of h.frames.splice(0)) frame();
  assert.equal(await loading, false);
  assert.equal(h.render().draftId, null);
});

test('save and publish share a synchronous write guard', async () => {
  const pending = deferred();
  const server = backend();
  const h = await harness({ server, overrides: { runTransaction: async (...args) => {
    await pending.promise; return server.firestore.runTransaction(...args);
  } } });
  const saving = h.render().saveDraft({}, meta);
  assert.equal(await h.render().saveDraft({}, meta), false);
  assert.equal(await h.render().publish({ ...meta, title: 'Issue' }), false);
  assert.equal(await h.render().loadDraft('other', h.setters), false);
  h.render().startNewDraft(h.setters);
  pending.resolve();
  assert.equal(await saving, true);
  assert.equal(server.commits.length, 1);
});

test('concurrent first publications retry and allocate unique editions above the legacy maximum', async () => {
  const server = backend({ 'articles/legacy': { status: 'published', sortIndex: 120, editionNo: '120' } });
  const a = await harness({ server });
  const b = await harness({ server });
  assert.deepEqual(await Promise.all([
    a.render().publish({ ...meta, title: 'A' }), b.render().publish({ ...meta, title: 'B' }),
  ]), [true, true]);
  const issues = [...server.data].filter(([path, value]) => path.startsWith('articles/') && value.title).map(([, value]) => value);
  assert.deepEqual(issues.map((value) => value.sortIndex).sort(), [121, 122]);
  const summaries = [...server.data].filter(([path]) => path.startsWith('articleSummaries/')).map(([, value]) => value);
  assert.deepEqual(summaries.map((value) => value.editionNo).sort(), ['121', '122']);
  assert.ok(summaries.every((value) => !('contentHTML' in value)), 'summaries never carry the article body');
  assert.deepEqual(issues.map((value) => value.editionNo).sort(), ['121', '122']);
  assert.ok(server.retries > 0);
  assert.equal(server.allocatedRefs, 2, 'retry reuses the original document refs');
  const counter = server.data.get('counters/articles');
  assert.equal(counter.lastIndex, 122);
  assert.equal(server.data.get('articles/' + counter.articleId).sortIndex, counter.lastIndex);
  // counter, article and its home summary
  for (const commit of server.commits) assert.equal(commit.length, 3);
});

test('seeded counter increments exactly once per new publication without querying the legacy maximum', async () => {
  const server = backend({ 'counters/articles': { lastIndex: 999, articleId: 'legacy' } });
  const h = await harness({ server, overrides: { getDocs: async (query) => {
    assert.ok(!query.clauses.some((clause) => clause.order === 'sortIndex'));
    return { docs: [], empty: true };
  } } });
  await h.render().publish({ ...meta, title: 'Next' });
  assert.equal(server.data.get('counters/articles').lastIndex, 1000);
  assert.equal(server.data.get('articles/' + h.render().draftId).editionNo, '1000');
});

test('revision publication updates the source and deletes its draft in the same commit without allocating an edition', async () => {
  const server = backend({
    'articles/source': { status: 'published', sortIndex: 8, editionNo: '008', authorEmail: meta.authorEmail },
    'articles/revision': { status: 'draft', sourceArticleId: 'source', authorEmail: meta.authorEmail },
    'counters/articles': { lastIndex: 8, articleId: 'source' },
  });
  const h = await harness({ server });
  await h.render().loadDraft('revision', h.setters);
  h.render().setIsDirty(true);
  assert.equal(await h.render().publish({ ...meta, title: 'Revised' }), true);
  assert.equal(server.data.has('articles/revision'), false);
  assert.equal(server.data.get('articles/source').title, 'Revised');
  assert.equal(server.data.get('articles/source').sortIndex, 8);
  assert.equal(server.data.get('counters/articles').lastIndex, 8);
  assert.equal(server.data.get('articleSummaries/source').title, 'Revised');
  assert.equal(server.data.get('articleSummaries/source').editionNo, '008');
  assert.equal(server.commits[0].length, 3);
});

test('failed or missing revision source leaves draft and recovery intact', async () => {
  const server = backend({ 'articles/revision': { status: 'draft', sourceArticleId: 'missing', authorEmail: meta.authorEmail } });
  const h = await harness({ server });
  await h.render().loadDraft('revision', h.setters);
  h.render().setIsDirty(true);
  assert.equal(await h.render().publish({ ...meta, title: 'Revision' }), false);
  assert.ok(server.data.has('articles/revision'));
  assert.ok(readRecovery(h.storage, recoveryKey(meta.authorEmail, 'revision')));
  assert.equal(server.commits.length, 0);
  assert.equal(h.render().isDirty, true);
});

test('saving a published article clones a revision draft and leaves the source intact', async () => {
  const server = backend({ 'articles/source': { status: 'published', title: 'Original', sortIndex: 7, authorEmail: meta.authorEmail } });
  const h = await harness({ server });
  await h.render().loadDraft('source', h.setters);
  h.render().setIsDirty(true);
  await h.render().saveDraft({ markClean: true }, { ...meta, title: 'Edited' });
  assert.equal(server.data.get('articles/source').title, 'Original');
  const revision = server.data.get('articles/' + h.render().draftId);
  assert.equal(revision.status, 'draft');
  assert.equal(revision.sourceArticleId, 'source');
});

test('publishing stays open with edits made during the request and leaves recovery for the published target', async () => {
  for (const editDuringWrite of [true, false]) {
    const pending = deferred();
    const server = backend();
    const h = await harness({ server, overrides: { runTransaction: async (...args) => {
      await pending.promise; return server.firestore.runTransaction(...args);
    } } });
    h.render().setIsDirty(true);
    const publishing = h.render().publish({ ...meta, title: 'Issue' });
    if (editDuringWrite) {
      h.editor.html = '<p>newer</p>';
      h.render().setIsDirty(true);
      h.render().runAutosave({ ...meta, title: 'Newer' });
    }
    pending.resolve();
    await publishing;
    assert.equal(h.render().isDirty, editDuringWrite);
    assert.equal(h.navigations.length, editDuringWrite ? 0 : 1);
    if (!editDuringWrite) assert.deepEqual(h.navigationDirty, [false], 'successful publication bypasses the dirty navigation guard');
    if (editDuringWrite) assert.ok(readRecovery(h.storage, recoveryKey(meta.authorEmail, h.render().draftId)));
    h.unmount();
  }
});

test('identity changes invalidate pending saves and isolate recovery', async () => {
  const pending = deferred();
  const server = backend();
  const h = await harness({ server, overrides: { runTransaction: async (...args) => {
    await pending.promise; return server.firestore.runTransaction(...args);
  } } });
  h.render().setIsDirty(true);
  const saving = h.render().saveDraft({ markClean: true }, meta);
  h.render({ authorEmail: 'other@example.com' });
  pending.resolve();
  await saving;
  assert.equal(h.render().draftId, null);
  assert.equal(h.render().recovery, null);
  assert.ok(readRecovery(h.storage, recoveryKey(meta.authorEmail)));
});

test('storage failures surface a recovery warning without blocking server save', async () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() {} };
  const h = await harness({ storage });
  h.render().setIsDirty(true);
  h.render().runAutosave(meta);
  assert.equal(h.render().recoveryError, true);
  await h.fireAutosave();
  assert.equal(h.render().isDirty, false);
  h.unmount();
});

test('unmount during autosave does not reschedule or clear unsaved recovery', async () => {
  const pending = deferred();
  const server = backend();
  const h = await harness({ server, overrides: { runTransaction: async (...args) => {
    await pending.promise; return server.firestore.runTransaction(...args);
  } } });
  h.render().setIsDirty(true);
  h.render().runAutosave(meta);
  const saving = h.fireAutosave();
  h.unmount();
  pending.resolve();
  await saving;
  assert.equal(h.timers.size, 0);
  assert.ok(readRecovery(h.storage, recoveryKey(meta.authorEmail)));
});

test('publication retries a permission-denied only after a fresh counter proves advancement', async () => {
  const denied = Object.assign(new Error('counter conflict'), { code: 'permission-denied' });
  const counterRef = { id: 'articles', path: 'counters/articles' };
  const db = {};
  let attempts = 0;
  let probes = 0;
  const h = await harness({ overrides: {
    runTransaction: async (receivedDb, callback) => {
      assert.equal(receivedDb, db);
      attempts++;
      const result = await callback({ index: attempts === 1 ? 6 : 7 });
      if (attempts === 1) throw denied;
      return result;
    },
    getDoc: async (ref) => {
      assert.equal(ref, counterRef);
      probes++;
      return snapshot({ lastIndex: 7 });
    },
  } });
  const result = await h.runPublicationTransaction(db, counterRef, (tx, noteCounterRead) => {
    noteCounterRead(tx.index);
    return tx.index + 1;
  });
  assert.equal(result, 8);
  assert.equal(attempts, 2);
  assert.equal(probes, 1);
});

test('publication does not retry unproven conflicts or other errors, and preserves the original error', async () => {
  const cases = [
    { code: 'permission-denied', old: 6, fresh: snapshot({ lastIndex: 6 }), probes: 1 },
    { code: 'permission-denied', old: 6, fresh: snapshot({ lastIndex: 5 }), probes: 1 },
    { code: 'permission-denied', old: 6, fresh: snapshot({ lastIndex: '7' }), probes: 1 },
    { code: 'permission-denied', old: 6, fresh: snapshot(undefined), probes: 1 },
    { code: 'permission-denied', old: 6, fresh: { ...snapshot({ lastIndex: 7 }), metadata: { fromCache: true } }, probes: 1 },
    { code: 'permission-denied', old: undefined, fresh: snapshot({ lastIndex: 7 }), probes: 0 },
    { code: 'permission-denied', old: '6', fresh: snapshot({ lastIndex: 7 }), probes: 0 },
    { code: 'permission-denied', old: -1, fresh: snapshot({ lastIndex: 7 }), probes: 0 },
    { code: 'permission-denied', old: 6, probeError: true, probes: 1 },
    { code: 'unauthenticated', old: 6, fresh: snapshot({ lastIndex: 7 }), probes: 0 },
    { code: 'unavailable', old: 6, fresh: snapshot({ lastIndex: 7 }), probes: 0 },
  ];
  for (const scenario of cases) {
    let attempts = 0;
    let probes = 0;
    const original = Object.assign(new Error('denied'), { code: scenario.code });
    const h = await harness({ overrides: {
      runTransaction: async (_db, callback) => {
        attempts++;
        await callback({});
        throw original;
      },
      getDoc: async () => {
        probes++;
        if (scenario.probeError) throw new Error('probe denied');
        return scenario.fresh;
      },
    } });
    await assert.rejects(h.runPublicationTransaction({}, {}, (_tx, note) => note(scenario.old)), (error) => error === original);
    assert.equal(attempts, 1);
    assert.equal(probes, scenario.probes);
  }
});

test('publication conflict recovery is bounded to three new transactions', async () => {
  let attempts = 0;
  let probes = 0;
  const original = Object.assign(new Error('conflict'), { code: 'permission-denied' });
  const h = await harness({ overrides: {
    runTransaction: async (_db, callback) => {
      attempts++;
      await callback({});
      throw original;
    },
    getDoc: async () => { probes++; return snapshot({ lastIndex: attempts + 6 }); },
  } });
  await assert.rejects(h.runPublicationTransaction({}, {}, (_tx, note) => note(attempts + 5)), (error) => error === original);
  assert.equal(attempts, 4);
  assert.equal(probes, 3);
});

test('publication proof resets for each callback attempt made by Firestore itself', async () => {
  for (const latestIndex of [undefined, 9]) {
    let probes = 0;
    let attempts = 0;
    const original = Object.assign(new Error('denied on SDK retry'), { code: 'permission-denied' });
    const h = await harness({ overrides: {
      runTransaction: async (_db, callback) => {
        attempts++;
        await callback({ index: 6 });
        await callback({ index: latestIndex });
        throw original;
      },
      getDoc: async () => { probes++; return snapshot({ lastIndex: 8 }); },
    } });
    await assert.rejects(h.runPublicationTransaction({}, {}, (tx, note) => {
      if (tx.index !== undefined) note(tx.index);
    }), (error) => error === original);
    assert.equal(attempts, 1);
    assert.equal(probes, latestIndex === undefined ? 0 : 1);
  }
});

test('simultaneous publications recover from rule-denied counter conflicts using the same target refs', async () => {
  const server = backend({ 'counters/articles': { lastIndex: 6, articleId: 'legacy' } }, { permissionConflicts: true });
  const a = await harness({ server });
  const b = await harness({ server });
  assert.deepEqual(await Promise.all([
    a.render().publish({ ...meta, title: 'A' }), b.render().publish({ ...meta, title: 'B' }),
  ]), [true, true]);
  assert.deepEqual([...server.data].filter(([path, value]) => path.startsWith('articles/') && value.title).map(([, value]) => value.sortIndex).sort(), [7, 8]);
  assert.equal(server.data.get('counters/articles').lastIndex, 8);
  assert.ok(server.retries > 0);
  assert.equal(server.allocatedRefs, 2);
  assert.equal(server.commits.length, 2);
  assert.ok(server.commits.every((commit) => commit.length === 3));
});

const historyMeta = { ...meta, title: '새 초안', category: 'EXHIBITION' };
const historyRows = (server, articleId) => [...server.data].filter(([path]) => path.startsWith(`articles/${articleId}/history/`)).map(([path, value]) => ({ path, ...value }));

test('manual saves and autosaves write one unique atomic snapshot per successful operation', async () => {
  const h = await harness({ initialProps: { historyUserId: 'actor-uid' } });
  h.render().setIsDirty(true);
  assert.equal(await h.render().saveDraft({ markClean: true }, historyMeta), true);
  const id = h.render().draftId;
  h.render().setIsDirty(true);
  h.render().runAutosave({ ...historyMeta, title: '자동 저장 초안' });
  await h.fireAutosave();
  const rows = historyRows(h.server, id);
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((row) => row.path)).size, 2);
  assert.deepEqual(rows.map((row) => row.label), ['초안 저장', '자동 저장']);
  assert.ok(rows.every((row) => row.ownerEmail === meta.authorEmail && row.userId === 'actor-uid' && row.authorUid === 'actor-uid'));
  assert.ok(h.server.commits.every((commit) => commit.length === 2 && commit.some((write) => write.ref.path.includes('/history/'))));
  assert.equal(rows[1].snapshot.title, '자동 저장 초안');
  assert.equal(rows[1].snapshot.contentHTML, h.editor.html);
  assert.equal(rows[1].snapshot.authorEmail, undefined);
  h.unmount();
});

test('published-to-revision save preserves source BEFORE and draft AFTER with persisted owner and separate actor', async () => {
  const owner = 'owner@example.com';
  const server = backend({ 'articles/source': { ...historyMeta, title: '원본', contentHTML: '<p>원본 내용</p>', status: 'published', authorEmail: owner, sortIndex: 7 } });
  const h = await harness({ server, initialProps: { isAdmin: true, historyUserId: 'admin-uid' } });
  await h.render().loadDraft('source', h.setters);
  h.editor.html = '<p>수정 내용</p>';
  h.render().setIsDirty(true);
  assert.equal(await h.render().saveDraft({ markClean: true }, historyMeta), true);
  const draftId = h.render().draftId;
  assert.notEqual(draftId, 'source');
  assert.equal(server.data.get('articles/source').title, '원본');
  assert.equal(historyRows(server, 'source')[0].snapshot.contentHTML, '<p>원본 내용</p>');
  assert.equal(historyRows(server, draftId)[0].snapshot.contentHTML, '<p>수정 내용</p>');
  assert.ok([...historyRows(server, 'source'), ...historyRows(server, draftId)].every((row) => row.ownerEmail === owner && row.authorUid === 'admin-uid'));
  assert.equal(server.commits[0].length, 3);
});

test('revision publication atomically records source BEFORE/AFTER and deletes draft without changing edition', async () => {
  const owner = 'owner@example.com';
  const server = backend({
    'articles/source': { ...historyMeta, title: '원본', status: 'published', authorEmail: owner, sortIndex: 7, editionNo: '007' },
    'articles/revision': { ...historyMeta, status: 'draft', authorEmail: owner, sourceArticleId: 'source' },
  });
  const h = await harness({ server, initialProps: { isAdmin: true, historyUserId: 'admin-uid' } });
  await h.render().loadDraft('revision', h.setters);
  assert.equal(await h.render().publish({ ...historyMeta, title: '수정본' }), true);
  assert.equal(server.data.has('articles/revision'), false);
  assert.equal(server.data.get('articles/source').editionNo, '007');
  assert.equal(server.data.has('counters/articles'), false);
  const rows = historyRows(server, 'source');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.snapshot.title), ['원본', '수정본']);
  assert.ok(rows.every((row) => row.ownerEmail === owner && row.userId === 'admin-uid'));
  assert.equal(server.commits[0].length, 5);
});

test('direct published update records BEFORE/AFTER while new publication records only AFTER', async () => {
  const server = backend({ 'articles/source': { ...historyMeta, title: '원본', status: 'published', authorEmail: meta.authorEmail, sortIndex: 7 } });
  const h = await harness({ server, initialProps: { historyUserId: 'actor-uid' } });
  await h.render().loadDraft('source', h.setters);
  assert.equal(await h.render().publish({ ...historyMeta, title: '새 원본' }), true);
  assert.deepEqual(historyRows(server, 'source').map((row) => row.snapshot.title), ['원본', '새 원본']);
  assert.equal(server.commits[0].length, 4);
  const fresh = await harness({ initialProps: { historyUserId: 'actor-uid' } });
  assert.equal(await fresh.render().publish(historyMeta), true);
  assert.equal(historyRows(fresh.server, fresh.render().draftId).length, 1);
  assert.equal(fresh.server.commits[0].length, 4);
});

test('history denial rolls back article, history and publication counter together and retains recovery', async () => {
  for (const publication of [false, true]) {
    const server = backend({}, { failHistory: true });
    const h = await harness({ server, initialProps: { historyUserId: 'actor-uid' } });
    h.render().setIsDirty(true);
    const result = publication ? await h.render().publish(historyMeta) : await h.render().saveDraft({ markClean: true }, historyMeta);
    assert.equal(result, false);
    assert.equal(server.data.size, 0);
    assert.equal(server.commits.length, 0);
    assert.equal(h.render().isDirty, true);
    assert.equal(h.render().isSaving, false);
    assert.ok(readRecovery(h.storage, recoveryKey(meta.authorEmail)));
  }
});

test('postcommit history pruning failure never reports a committed save or publication as failed', async () => {
  for (const publication of [false, true]) {
    const server = backend();
    const h = await harness({ server, initialProps: { historyUserId: 'actor-uid' }, overrides: {
      getDocs: async (query) => {
        if (query.collection.endsWith('/history')) throw new Error('prune denied');
        return server.firestore.getDocs(query);
      },
    } });
    h.render().setIsDirty(true);
    const result = publication ? await h.render().publish(historyMeta) : await h.render().saveDraft({ markClean: true }, historyMeta);
    assert.equal(result, true);
    assert.equal(h.render().isDirty, false);
    assert.equal(historyRows(server, h.render().draftId).length, 1);
    assert.equal(server.commits.length, 1);
  }
});

test('concurrent publication retries reuse history IDs and commit no orphan or duplicate snapshots', async () => {
  for (const permissionConflicts of [false, true]) {
    const server = backend({ 'counters/articles': { lastIndex: 6, articleId: 'legacy' } }, { permissionConflicts });
    const a = await harness({ server, initialProps: { historyUserId: 'uid-a' } });
    const b = await harness({ server, initialProps: { historyUserId: 'uid-b' } });
    assert.deepEqual(await Promise.all([a.render().publish({ ...historyMeta, title: 'A' }), b.render().publish({ ...historyMeta, title: 'B' })]), [true, true]);
    assert.ok(server.retries > 0);
    assert.equal(server.allocatedRefs, 6, 'article and before/after IDs allocated only once per operation');
    assert.equal(server.commits.length, 2);
    const histories = [...server.data].filter(([path]) => path.includes('/history/'));
    assert.equal(histories.length, 2);
    for (const [path, row] of histories) {
      assert.equal(server.data.get(path.split('/history/')[0]).title, row.snapshot.title);
      const attemptedIds = server.attempts.flat().filter((write) => write.value?.snapshot?.title === row.snapshot.title).map((write) => write.ref.path);
      assert.equal(new Set(attemptedIds).size, 1);
    }
  }
});

test('concurrent published updates capture the freshly retried BEFORE source and retain both pairs under limit', async () => {
  const server = backend({ 'articles/source': { ...historyMeta, title: 'Original', status: 'published', authorEmail: meta.authorEmail, sortIndex: 7 } });
  const a = await harness({ server, initialProps: { historyUserId: 'uid-a' } });
  const b = await harness({ server, initialProps: { historyUserId: 'uid-b' } });
  await a.render().loadDraft('source', a.setters);
  await b.render().loadDraft('source', b.setters);
  assert.deepEqual(await Promise.all([a.render().publish({ ...historyMeta, title: 'A' }), b.render().publish({ ...historyMeta, title: 'B' })]), [true, true]);
  assert.ok(server.retries > 0);
  const rows = historyRows(server, 'source');
  assert.equal(rows.length, 4);
  assert.equal(rows.filter((row) => row.label === '발행 전 원본').length, 2);
  assert.ok(rows.some((row) => row.label === '발행 전 원본' && row.snapshot.title === 'Original'));
  assert.ok(rows.some((row) => row.label === '발행 전 원본' && row.snapshot.title !== 'Original'));
  assert.equal(new Set(rows.map((row) => row.path)).size, 4);
});

test('holdAutosave keeps restored edits local until explicit save and failed save preserves the hold', async () => {
  const server = backend();
  let fail = true;
  const h = await harness({ server, initialProps: { historyUserId: 'actor-uid' }, overrides: {
    runTransaction: async (...args) => {
      if (fail) throw new Error('offline');
      return server.firestore.runTransaction(...args);
    },
  } });
  h.render().setIsDirty(true);
  h.render().holdAutosave();
  h.render().runAutosave(historyMeta);
  await h.fireAutosave();
  assert.equal(server.commits.length, 0);
  assert.equal(h.render().recoveryNeedsSave, true);
  assert.equal(await h.render().saveDraft({ markClean: true }, historyMeta), false);
  fail = false;
  await h.fireAutosave();
  assert.equal(server.commits.length, 0);
  assert.equal(await h.render().saveDraft({ markClean: true }, historyMeta), true);
  assert.equal(h.render().recoveryNeedsSave, false);
  h.render().setIsDirty(true);
  h.render().runAutosave({ ...historyMeta, title: 'Next' });
  await h.fireAutosave();
  assert.equal(server.commits.length, 2);
  h.unmount();
});

test('hold during an in-flight save prevents completion from clearing restored edits or resuming autosave', async () => {
  const pending = deferred();
  const server = backend();
  const h = await harness({ server, initialProps: { historyUserId: 'actor-uid' }, overrides: {
    runTransaction: async (...args) => { await pending.promise; return server.firestore.runTransaction(...args); },
  } });
  h.render().setIsDirty(true);
  const saving = h.render().saveDraft({ markClean: true }, historyMeta);
  h.editor.html = '<p>Restored</p>';
  h.render().setIsDirty(true);
  h.render().holdAutosave();
  h.render().runAutosave({ ...historyMeta, title: 'Restored' });
  pending.resolve();
  assert.equal(await saving, true);
  assert.equal(h.render().isDirty, true);
  assert.equal(h.render().recoveryNeedsSave, true);
  await h.fireAutosave();
  assert.equal(server.commits.length, 1);
  assert.equal(historyRows(server, h.render().draftId)[0].snapshot.title, historyMeta.title);
  h.unmount();
});
