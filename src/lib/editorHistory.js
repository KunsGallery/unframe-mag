import { collection, doc, getDocs, query, orderBy, limit, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_CATEGORY } from '../constants/categories.js';

export const HISTORY_LIMIT = 30;
export const TEMPLATE_LIMIT = 20;
const MAX_BYTES = 700000;
const fields = ['title', 'subtitle', 'category', 'cover', 'coverMedium', 'contentHTML'];
export function editorSnapshot(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid editor snapshot');
  const snapshot = Object.fromEntries(fields.map((field) => {
    const item = value[field] ?? (field === 'category' ? DEFAULT_ARTICLE_CATEGORY : '');
    if (typeof item !== 'string') throw new Error(`Invalid ${field}`);
    return [field, item];
  }));
  if (!ARTICLE_CATEGORIES.some(({ key }) => key === snapshot.category)) throw new Error('Invalid category');
  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > MAX_BYTES) throw new Error('Snapshot is too large');
  return snapshot;
}

export function editorStorage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
function scope(userId, articleId, kind) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('A signed-in user is required');
  return `unframe:editor:${kind}:v1:${encodeURIComponent(userId)}${articleId ? `:${encodeURIComponent(articleId)}` : ''}`;
}
function readList(storage, key) {
  if (!storage) throw new Error('Local storage is unavailable');
  const raw = storage.getItem(key);
  if (raw === null) return [];
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.items)) throw new Error('Stored editor data is invalid');
  return value.items;
}
function writeList(storage, key, items) {
  if (!storage) throw new Error('Local storage is unavailable');
  storage.setItem(key, JSON.stringify({ version: 1, items }));
}
function token() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function validRecord(record) {
  if (!record || typeof record.id !== 'string' || !record.id || !Number.isFinite(record.savedAt) || typeof record.label !== 'string') throw new Error('Invalid history record');
  return { ...record, snapshot: editorSnapshot(record.snapshot) };
}

/** Allocate once BEFORE runTransaction, then call writeEditorHistory in its callback.
 * No reads, clocks or ID allocation happen in writeEditorHistory, so retries reuse
 * the immutable payload. Rules should bind ownerEmail to parent getAfter().
 * Pruning is a separate post-commit operation, never part of the article write.
 */
export function allocateEditorHistory({ db, articleId, userId, ownerEmail, snapshot, label = '저장한 수정본' }) {
  if (!db || typeof articleId !== 'string' || !articleId || articleId.includes('/')) throw new Error('An article ID is required');
  scope(userId, articleId, 'history');
  if (typeof ownerEmail !== 'string' || !ownerEmail.trim()) throw new Error('An owner email is required');
  if (typeof label !== 'string' || label.length > 120) throw new Error('Invalid revision label');
  const ref = doc(collection(db, 'articles', articleId, 'history'));
  const data = Object.freeze({ version: 1, userId, ownerEmail, label, savedAt: Date.now(), snapshot: Object.freeze(editorSnapshot(snapshot)) });
  return Object.freeze({ ref, data });
}
export function writeEditorHistory(transaction, allocated) {
  if (!transaction?.set || !allocated?.ref || allocated.data?.version !== 1) throw new Error('Invalid history allocation');
  transaction.set(allocated.ref, { ...allocated.data, createdAt: serverTimestamp() });
  return allocated.ref.id;
}
export async function pruneEditorHistory(db, articleId) {
  if (!db || typeof articleId !== 'string' || !articleId || articleId.includes('/')) throw new Error('An article ID is required');
  const result = await getDocs(query(collection(db, 'articles', articleId, 'history'), orderBy('savedAt', 'desc'), limit(400)));
  const obsolete = result.docs.slice(HISTORY_LIMIT);
  if (obsolete.length) {
    const batch = writeBatch(db);
    obsolete.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
  return obsolete.length;
}

/** Instance belongs to one user/document. save() follows successful article saves.
 * prepareRestore() never writes an article: parent applies snapshot, marks dirty,
 * and holds autosave until explicit Save. Guard with parent revision/session token.
 * Firestore rules must authorize history by the parent article, including deletes.
 */
export function createEditorHistory({ db = null, userId, articleId, ownerEmail = '', storage = editorStorage() }) {
  if (typeof articleId !== 'string' || !articleId || articleId.includes('/')) throw new Error('An article ID is required');
  const key = scope(userId, articleId, 'history');
  const localList = () => readList(storage, key).map(validRecord).slice(0, HISTORY_LIMIT);
  const remember = (snapshot, label) => {
    const items = localList();
    if (items[0]?.label === label && JSON.stringify(items[0]?.snapshot) === JSON.stringify(snapshot)) return items[0];
    const record = { id: token(), savedAt: Date.now(), label, snapshot };
    writeList(storage, key, [record, ...items].slice(0, HISTORY_LIMIT));
    return record;
  };
  const remoteList = async () => {
    const result = await getDocs(query(collection(db, 'articles', articleId, 'history'), orderBy('savedAt', 'desc'), limit(HISTORY_LIMIT + 1)));
    return result.docs.map((entry) => validRecord({ ...entry.data(), id: entry.id }));
  };
  return {
    async list() {
      if (!db) return { items: localList().map((item) => ({ ...item, localOnly: true })), source: 'local', error: null };
      let local = [];
      let localError = null;
      try { local = localList(); } catch (error) { localError = error; }
      try {
        const remote = (await remoteList()).slice(0, HISTORY_LIMIT);
        const ids = new Set(remote.map((item) => item.id));
        // Both stores are bounded separately. Never truncate away a local safety
        // backup merely because the server already has a full retention window.
        const items = [...remote.map((item) => ({ ...item, localOnly: false })),
          ...local.filter((item) => !ids.has(item.id)).map((item) => ({ ...item, localOnly: true }))];
        items.sort((a, b) => b.savedAt - a.savedAt);
        return { items, source: 'firestore', error: localError };
      } catch (error) { return { items: local.map((item) => ({ ...item, localOnly: true })), source: 'local', error }; }
    },
    async save(value, { label = '저장한 수정본' } = {}) {
      const snapshot = editorSnapshot(value);
      if (typeof label !== 'string' || label.length > 120) throw new Error('Invalid revision label');
      // Keep a local copy before network work; quota/corruption failures are surfaced.
      const record = remember(snapshot, label);
      if (!db) return { record, source: 'local', error: null };
      try {
        const ref = doc(db, 'articles', articleId, 'history', record.id);
        await runTransaction(db, async (transaction) => {
          const existing = await transaction.get(ref);
          if (!existing.exists()) {
            if (!ownerEmail.trim()) throw new Error('An owner email is required');
            transaction.set(ref, { ...record, userId, ownerEmail, createdAt: serverTimestamp(), version: 1 });
          }
        });
        await pruneEditorHistory(db, articleId);
        return { record, source: 'firestore', error: null };
      } catch (error) { return { record, source: 'local', error }; }
    },
    prepareRestore(record, currentSnapshot) {
      const selected = validRecord(record);
      const backup = remember(editorSnapshot(currentSnapshot), '복원 전 내용');
      return { snapshot: selected.snapshot, backup, restoredFrom: selected.id };
    },
  };
}

export const BUILT_IN_TEMPLATES = Object.freeze([
  { id: 'builtin-exhibition', name: '전시', snapshot: editorSnapshot({ category: 'EXHIBITION', contentHTML: '<p></p><h2>전시 소개</h2><p></p><h2>주요 작품</h2><p></p><h2>관람 안내</h2><p></p>' }) },
  { id: 'builtin-interview', name: '인터뷰', snapshot: editorSnapshot({ category: 'INTERVIEW', contentHTML: '<p></p><h2>들어가며</h2><p></p><h2>대화</h2><p><strong>질문.</strong> </p><p><strong>답변.</strong> </p><h2>작가 소개</h2><p></p>' }) },
  { id: 'builtin-review', name: '리뷰', snapshot: editorSnapshot({ category: 'REVIEW', contentHTML: '<p></p><h2>첫인상</h2><p></p><h2>자세히 보기</h2><p></p><h2>마치며</h2><p></p>' }) },
].map((item) => Object.freeze({ ...item, builtIn: true, snapshot: Object.freeze(item.snapshot) })));

function validTemplate(item) {
  if (!item || typeof item.id !== 'string' || !item.id || item.id.startsWith('builtin-') || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || !Number.isFinite(item.savedAt)) throw new Error('Invalid saved template');
  return { id: item.id, name: item.name.trim(), savedAt: item.savedAt, snapshot: editorSnapshot(item.snapshot), builtIn: false };
}
export function createEditorTemplates({ userId, storage = editorStorage() }) {
  const key = scope(userId, null, 'templates');
  const saved = () => {
    const items = readList(storage, key);
    if (items.length > TEMPLATE_LIMIT) throw new Error('Too many saved templates');
    return items.map(validTemplate);
  };
  const preserve = (value) => {
    const backup = { id: token(), savedAt: Date.now(), snapshot: editorSnapshot(value) };
    if (!storage) throw new Error('Local storage is unavailable');
    storage.setItem(`${key}:before-apply`, JSON.stringify({ version: 1, ...backup }));
    return backup;
  };
  const readBackup = () => {
    if (!storage) throw new Error('Local storage is unavailable');
    const raw = storage.getItem(`${key}:before-apply`);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (item.version !== 1 || !Number.isFinite(item.savedAt) || typeof item.id !== 'string') throw new Error('Invalid template backup');
    return { ...item, snapshot: editorSnapshot(item.snapshot) };
  };
  return {
    list: () => [...BUILT_IN_TEMPLATES.map((item) => ({ ...item, snapshot: { ...item.snapshot } })), ...saved()],
    save(name, value) {
      const item = validTemplate({ id: token(), name, savedAt: Date.now(), snapshot: value });
      const items = saved();
      if (items.length >= TEMPLATE_LIMIT) throw new Error('Template limit reached; delete a saved template first');
      writeList(storage, key, [item, ...items]);
      return item;
    },
    remove(id) {
      if (typeof id !== 'string' || id.startsWith('builtin-')) throw new Error('Built-in templates cannot be deleted');
      const items = saved();
      writeList(storage, key, items.filter((item) => item.id !== id));
    },
    prepareApply(template, currentSnapshot) {
      const snapshot = template.builtIn
        ? editorSnapshot(BUILT_IN_TEMPLATES.find((item) => item.id === template.id)?.snapshot)
        : validTemplate(template).snapshot;
      // One per-user safety slot: do not change the editor if preservation fails.
      const backup = preserve(currentSnapshot);
      return { snapshot, backup };
    },
    readBackup,
    prepareRestoreBackup(currentSnapshot) {
      const selected = readBackup();
      if (!selected) throw new Error('No template backup');
      const backup = preserve(currentSnapshot);
      return { snapshot: selected.snapshot, backup, restoredFrom: selected.id };
    },
  };
}
