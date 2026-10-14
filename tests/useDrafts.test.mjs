import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

const source = await readFile(new URL('../src/hooks/useDrafts.js', import.meta.url), 'utf8');
const meta = { title: '', subtitle: '', category: 'ART', cover: '', coverMedium: '', authorEmail: 'author@example.com' };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const snapshot = (data) => ({ exists: () => true, data: () => data });

async function harness(overrides = {}) {
  const slots = [];
  let cursor = 0;
  const timers = new Map();
  const frames = [];
  const writes = [];
  const navigations = [];
  const toasts = [];
  const editor = {
    isInitialized: true, isDestroyed: false, isEmpty: false,
    getHTML: () => '<div data-uf-gallery="true"></div>',
    getText: () => '',
    commands: { setContent: (html) => { editor.html = html; } },
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(fn, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        slots[index] = { fn, dependencies };
      }
      return slots[index].fn;
    },
    useEffect() {},
  };
  const firestore = {
    collection: (_db, name) => name,
    query: (...args) => args,
    orderBy: (...args) => args,
    limit: (value) => value,
    where: (...args) => args,
    doc: (_db, _collection, id) => ({ id }),
    getDocs: async () => ({ docs: [], empty: true }),
    getDoc: async () => snapshot({ status: 'draft', authorEmail: meta.authorEmail }),
    addDoc: async (_collection, data) => { writes.push(data); return { id: 'created' }; },
    updateDoc: async (_ref, data) => { writes.push(data); },
    deleteDoc: async () => {},
    serverTimestamp: () => 123,
    ...overrides,
  };
  const context = createContext({
    console: { log() {}, error() {} },
    setTimeout(fn) { const id = Symbol(); timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    window: { requestAnimationFrame: (fn) => frames.push(fn) },
  });
  const module = new SourceTextModule(source, { context });
  await module.link((specifier) => {
    const exports = specifier === 'react' ? react
      : specifier === 'firebase/firestore' ? firestore
        : { DEFAULT_ARTICLE_CATEGORY: 'ART' };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  const render = () => {
    cursor = 0;
    return module.namespace.useDrafts({
      db: {}, editor, canWrite: true, authorEmail: meta.authorEmail,
      onToast: (message) => toasts.push(message), navigate: (path) => navigations.push(path),
    });
  };
  const applied = {};
  const setters = Object.fromEntries(['Title', 'Subtitle', 'Category', 'Cover', 'CoverMedium'].map((key) => [
    `set${key}`, (value) => { applied[key] = value; },
  ]));
  return {
    render, editor, timers, frames, writes, navigations, toasts, applied, setters,
    async fireAutosave() {
      assert.equal(timers.size, 1);
      const [id, fn] = timers.entries().next().value;
      timers.delete(id);
      await fn();
    },
  };
}

test('failed autosave preserves timestamp and dirty state and returns false', async () => {
  const h = await harness({ addDoc: async () => { throw new Error('write failed'); } });
  let api = h.render();
  api.setLastAutoSavedAt(42);
  api.setIsDirty(true);
  api = h.render();
  api.runAutosave(meta);
  await h.fireAutosave();
  api = h.render();
  assert.equal(api.lastAutoSavedAt, 42);
  assert.equal(api.isDirty, true);
  assert.equal(await api.saveDraft({}, meta), false);
  assert.equal(h.render().isSaving, false);
});

test('edits during a pending save remain dirty, including functional updates', async () => {
  const pending = deferred();
  const h = await harness({ addDoc: () => pending.promise });
  let api = h.render();
  const setter = api.setIsDirty;
  setter(true);
  api = h.render();
  assert.equal(api.setIsDirty, setter);
  const saving = api.saveDraft({ markClean: true }, meta);
  setter((previous) => previous ? previous : true);
  pending.resolve({ id: 'saved' });
  assert.equal(await saving, true);
  assert.equal(h.render().isDirty, true);
});

test('image-only content autosaves successfully; empty content does not', async () => {
  const h = await harness();
  h.render().setIsDirty(true);
  h.render().runAutosave(meta);
  await h.fireAutosave();
  assert.equal(h.writes.length, 1);
  assert.equal(h.render().isDirty, false);
  assert.equal(typeof h.render().lastAutoSavedAt, 'number');
  h.editor.isEmpty = true;
  h.render().setIsDirty(true);
  h.render().runAutosave(meta);
  assert.equal(h.timers.size, 0);
});

test('latest load wins and stale completion cannot clear loading state', async () => {
  const a = deferred();
  const b = deferred();
  const h = await harness({ getDoc: ({ id }) => id === 'a' ? a.promise : b.promise });
  const api = h.render();
  const loadingA = api.loadDraft('a', h.setters);
  const loadingB = api.loadDraft('b', h.setters);
  a.resolve(snapshot({ title: 'A', authorEmail: meta.authorEmail, contentHTML: '<p>A</p>' }));
  assert.equal(await loadingA, false);
  assert.equal(h.render().isDraftLoading, true);
  assert.equal(h.render().draftId, null);
  assert.deepEqual(h.applied, {});
  b.resolve(snapshot({ title: 'B', authorEmail: meta.authorEmail, contentHTML: '<p>B</p>' }));
  assert.equal(await loadingB, true);
  assert.equal(h.render().draftId, 'b');
  assert.equal(h.applied.Title, 'B');
  assert.equal(h.editor.html, '<p>B</p>');
});

test('load waits for readiness and New invalidates the waiting request', async () => {
  const h = await harness();
  h.editor.isInitialized = false;
  const loading = h.render().loadDraft('old', h.setters);
  await Promise.resolve();
  assert.equal(h.render().draftId, null);
  assert.deepEqual(h.applied, {});
  h.render().startNewDraft(h.setters);
  h.editor.isInitialized = true;
  for (const frame of h.frames.splice(0)) frame();
  assert.equal(await loading, false);
  assert.equal(h.render().draftId, null);
  assert.equal(h.editor.html, '');
  assert.equal(h.applied.Title, '');
});

test('save and publish share a synchronous write guard', async () => {
  const pending = deferred();
  let creates = 0;
  const h = await harness({ addDoc: () => { creates += 1; return pending.promise; } });
  const api = h.render();
  const saving = api.saveDraft({}, meta);
  assert.equal(await api.saveDraft({}, meta), false);
  await api.publish({ ...meta, title: 'Issue' });
  assert.equal(creates, 1);
  assert.equal(h.navigations.length, 0);
  pending.resolve({ id: 'saved' });
  assert.equal(await saving, true);
});

test('publish stays open with newer edits and navigates after an unchanged write', async () => {
  for (const editDuringWrite of [true, false]) {
    const pending = deferred();
    const h = await harness({ addDoc: () => pending.promise });
    h.render().setIsDirty(true);
    const publishing = h.render().publish({ ...meta, title: 'Issue' });
    if (editDuringWrite) h.render().setIsDirty((previous) => previous);
    pending.resolve({ id: 'published' });
    await publishing;
    assert.equal(h.render().isDirty, editDuringWrite);
    assert.equal(h.navigations.length, editDuringWrite ? 0 : 1);
    if (editDuringWrite) assert.match(h.toasts.at(-1), /아직 저장되지/);
    else assert.equal(h.navigations[0], '/');
  }
});
