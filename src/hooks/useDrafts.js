// src/hooks/useDrafts.js
import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
  runTransaction,
  where,
} from "firebase/firestore";
import { DEFAULT_ARTICLE_CATEGORY } from "../constants/categories";
import { runPublicationTransaction } from "../lib/publicationTransaction.js";
import { buildArticleSummary } from "../lib/articleSummary.js";
import { normalizeRelatedEditionNos } from "../lib/relatedArticles.js";
import { normalizeTags } from "../lib/articleTags.js";
import { editorSnapshot, pruneEditorHistory, writeEditorHistory } from "../lib/editorHistory.js";
import { activeRecoveryDocument, browserRecoveryStorage, draftSnapshot, nextEdition, readRecovery, recoveryKey, removeRecovery, writeRecovery } from "../lib/draftRecovery.js";

const AUTOSAVE_DELAY_MS = 30000;

// Related articles, the lead text and tags travel with the article but stay out
// of history and local recovery snapshots.
function articlePayload(meta, contentHTML) {
  return {
    ...draftSnapshot(meta, contentHTML),
    excerpt: String(meta?.excerpt ?? ""),
    tags: normalizeTags(meta?.tags),
    relatedEditionNos: normalizeRelatedEditionNos(meta?.relatedEditionNos),
  };
}

// Every save stamps a fresh editToken. A save whose article no longer carries the
// token this editor last saw was overwritten elsewhere (another tab, device or editor).
const newEditToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const UNKNOWN_BASE = undefined;

export class EditConflictError extends Error {
  constructor() {
    super("Article changed elsewhere");
    this.code = "edit-conflict";
  }
}

// Reserve IDs and time once per operation; a retry can discover a different
// source article but must reuse the same before/after IDs under that source.
function reserveHistory(db, articleId, userId) {
  if (!userId) return null;
  const before = doc(collection(db, "articles", articleId, "history")).id;
  const after = doc(collection(db, "articles", articleId, "history")).id;
  const savedAt = Date.now();
  return (transaction, targetId, ownerEmail, snapshot, label, isBefore = false) => {
    if (!ownerEmail) throw new Error("Missing history owner");
    writeEditorHistory(transaction, {
      ref: doc(db, "articles", targetId, "history", isBefore ? before : after),
      data: { version: 1, userId, authorUid: userId, ownerEmail, label, savedAt,
        snapshot: editorSnapshot(snapshot) },
    });
  };
}

async function pruneSavedHistory(db, userId, ...articleIds) {
  if (!userId) return;
  // Retention failure must never turn a committed article save into a failure.
  await Promise.allSettled([...new Set(articleIds.filter(Boolean))].map((id) => pruneEditorHistory(db, id)));
}

export function useDrafts({
  db,
  editor,
  canWrite = false,
  isAdmin = false,
  authorEmail = "",
  authorName = "",
  userId = authorEmail,
  historyUserId = "",
  documentId = null,
  onToast,
  navigate,
}) {
  const toast = useCallback((msg) => (onToast ? onToast(msg) : console.log(msg)), [onToast]);

  const [drafts, setDrafts] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isDirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const loadTokenRef = useRef(0);
  const savingRef = useRef(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [recoveryError, setRecoveryError] = useState(false);
  const [recoveryNeedsSave, setRecoveryNeedsSave] = useState(false);
  const recoveryRef = useRef(null);
  const recoveryDocumentRef = useRef(null);
  const recoveryHoldRef = useRef(false);
  const storage = browserRecoveryStorage();
  const keyRef = useRef(recoveryKey(userId, documentId));
  const draftIdRef = useRef(null);
  const sessionRef = useRef(0);
  const autosaveRef = useRef({ meta: null, save: null, timer: null, generation: 0, loading: false });
  // base: the editToken this editor's content derives from (UNKNOWN_BASE skips the check once).
  const editTokenRef = useRef({ base: UNKNOWN_BASE, own: new Set(), force: false });
  const [conflict, setConflictState] = useState(null);
  const conflictRef = useRef(null);
  const setConflict = useCallback((value) => { conflictRef.current = value; setConflictState(value); }, []);
  autosaveRef.current.loading = isDraftLoading;

  const offerRecovery = useCallback((id) => {
    keyRef.current = recoveryKey(userId, id);
    let record = readRecovery(storage, keyRef.current);
    recoveryDocumentRef.current = id;
    if (!id && !record) {
      const activeId = activeRecoveryDocument(storage, userId);
      const activeKey = recoveryKey(userId, activeId);
      record = activeId ? readRecovery(storage, activeKey) : null;
      if (record) {
        keyRef.current = activeKey;
        recoveryDocumentRef.current = activeId;
      }
    }
    recoveryRef.current = record;
    recoveryHoldRef.current = !!record;
    setRecoveryNeedsSave(false);
    setRecovery(record);
  }, [storage, userId]);

  useEffect(() => {
    sessionRef.current += 1;
    autosaveRef.current.generation += 1;
    clearTimeout(autosaveRef.current.timer);
    autosaveRef.current.timer = null;
    loadTokenRef.current += 1;
    draftIdRef.current = null;
    setDraftId(null);
    setDrafts([]);
    setIsDraftLoading(false);
    autosaveRef.current.loading = false;
    setLastAutoSavedAt(null);
    setRecoveryError(false);
    dirtyRef.current = false;
    setDirtyState(false);
    editTokenRef.current = { base: UNKNOWN_BASE, own: new Set(), force: false };
    setConflict(null);
    offerRecovery(documentId);
  }, [userId, historyUserId, documentId, offerRecovery, setConflict]);

  const captureRecovery = useCallback((meta) => {
    if (!dirtyRef.current || !editor || editor.isDestroyed || recoveryRef.current || !canWrite) return;
    const record = writeRecovery(storage, keyRef.current, draftSnapshot(meta, editor.getHTML()));
    const remembered = documentId || !draftIdRef.current || activeRecoveryDocument(storage, userId, draftIdRef.current);
    setRecoveryError(!record || (!remembered && !!draftIdRef.current));
    return record;
  }, [canWrite, editor, storage, documentId, userId]);

  const discardRecovery = useCallback(() => {
    if (!removeRecovery(storage, keyRef.current, recoveryRef.current?.token)) {
      offerRecovery(draftIdRef.current || documentId);
      return false;
    }
    recoveryRef.current = null;
    recoveryHoldRef.current = false;
    setRecovery(null);
    keyRef.current = recoveryKey(userId, draftIdRef.current || documentId);
    return true;
  }, [storage, offerRecovery, documentId, userId]);

  const setIsDirty = useCallback((value) => {
    const next = typeof value === "function" ? value(dirtyRef.current) : value;
    if (next) revisionRef.current += 1;
    dirtyRef.current = next;
    setDirtyState(next);
  }, []);

  const holdAutosave = useCallback(() => {
    revisionRef.current += 1;
    recoveryHoldRef.current = true;
    setRecoveryNeedsSave(true);
  }, []);

  useEffect(() => () => {
    loadTokenRef.current += 1;
    sessionRef.current += 1;
    autosaveRef.current.generation += 1;
    clearTimeout(autosaveRef.current.timer);
    autosaveRef.current.timer = null;
  }, [editor]);

  const waitForEditorReady = useCallback(async (loadToken) => {
    if (!editor) return false;
    if (editor.isDestroyed) return false;
    if (editor.isInitialized) return true;

    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      return false;
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const tick = () => {
        if (!editor || editor.isDestroyed || loadToken !== loadTokenRef.current) {
          finish(false);
          return;
        }

        if (editor.isInitialized) {
          finish(true);
          return;
        }

        window.requestAnimationFrame(tick);
      };

      window.requestAnimationFrame(tick);
    });
  }, [editor]);

  const refreshDrafts = useCallback(async () => {
    if (!canWrite) return;
    const session = sessionRef.current;

    try {
      const q = isAdmin
        ? query(
            collection(db, "articles"),
            where("status", "==", "draft"),
            orderBy("createdAt", "desc"),
            limit(50)
          )
        : query(
            collection(db, "articles"),
            where("status", "==", "draft"),
            where("authorEmail", "==", String(authorEmail || "")),
            orderBy("createdAt", "desc"),
            limit(50)
          );

      const snap = await getDocs(q);
      if (session === sessionRef.current) setDrafts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Draft list error:", e);
    }
  }, [db, canWrite, isAdmin, authorEmail]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts, editor]);

  const loadDraft = useCallback(
    async (docId, setters) => {
      if (savingRef.current) return false;
      const loadToken = ++loadTokenRef.current;
      const loadRevision = revisionRef.current;
      if (!editor || editor.isDestroyed) return false;

      setIsDraftLoading(true);
      autosaveRef.current.loading = true;
      try {
        const ref = doc(db, "articles", docId);
        const s = await getDoc(ref);
        if (loadToken !== loadTokenRef.current) return false;

        if (!s.exists()) {
          toast("초안을 찾을 수 없습니다.");
          return false;
        }

        const data = s.data() || {};

        if (!isAdmin && String(data.authorEmail || "") !== String(authorEmail || "")) {
          toast("이 초안에 접근할 권한이 없어요.");
          return false;
        }

        const ready = await waitForEditorReady(loadToken);
        if (!ready || editor.isDestroyed || loadToken !== loadTokenRef.current || revisionRef.current !== loadRevision) {
          return false;
        }

        editor.commands.setContent(data.contentHTML || "", { emitUpdate: false });
        revisionRef.current += 1;
        sessionRef.current += 1;
        draftIdRef.current = docId;
        setDraftId(docId);
        setters.setTitle(data.title || "");
        setters.setSubtitle(data.subtitle || "");
        setters.setCategory(data.category || DEFAULT_ARTICLE_CATEGORY);
        setters.setCover(data.cover || "");
        setters.setCoverMedium(data.coverMedium || "");
        setters.setRelatedEditionNos?.(normalizeRelatedEditionNos(data.relatedEditionNos, data.editionNo));
        setters.setExcerpt?.(data.excerpt || "");
        setters.setTags?.(normalizeTags(data.tags));
        editTokenRef.current = { base: data.editToken ?? null, own: new Set(), force: false };
        setConflict(null);
        setIsDirty(false);
        setLastAutoSavedAt(null);
        offerRecovery(docId);
        return true;
      } catch (e) {
        if (loadToken !== loadTokenRef.current) return false;
        console.error("Load draft error:", e);
        toast("초안 로딩 중 오류가 발생했습니다.");
        return false;
      } finally {
        if (loadToken === loadTokenRef.current) {
          autosaveRef.current.loading = false;
          setIsDraftLoading(false);
        }
      }
    },
    [db, editor, toast, isAdmin, authorEmail, waitForEditorReady, setIsDirty, offerRecovery, setConflict]
  );

  const startNewDraft = useCallback(
    (setters) => {
      if (savingRef.current) return;
      loadTokenRef.current += 1;
      sessionRef.current += 1;
      revisionRef.current += 1;
      setIsDraftLoading(false);
      autosaveRef.current.loading = false;
      setDraftId(null);
      draftIdRef.current = null;
      setters.setTitle("");
      setters.setSubtitle("");
      setters.setCategory(DEFAULT_ARTICLE_CATEGORY);
      setters.setCover("");
      setters.setCoverMedium("");
      setters.setRelatedEditionNos?.([]);
      setters.setExcerpt?.("");
      setters.setTags?.([]);
      editTokenRef.current = { base: null, own: new Set(), force: false };
      setConflict(null);
      editor?.commands?.setContent("", { emitUpdate: false });
      setIsDirty(false);
      setLastAutoSavedAt(null);
      offerRecovery(null);
      toast("새 초안을 시작합니다.");
    },
    [editor, toast, setIsDirty, offerRecovery, setConflict]
  );

  const restoreRecovery = useCallback((setters) => {
    if (!editor || editor.isDestroyed || !editor.isInitialized || savingRef.current || isDraftLoading) return false;
    const current = readRecovery(storage, keyRef.current);
    if (!current || current.token !== recoveryRef.current?.token) {
      offerRecovery(draftIdRef.current || documentId);
      return false;
    }
    const snapshot = current.snapshot;
    if (recoveryDocumentRef.current) {
      if (recoveryDocumentRef.current !== draftIdRef.current) editTokenRef.current = { base: UNKNOWN_BASE, own: new Set(), force: false };
      draftIdRef.current = recoveryDocumentRef.current;
      setDraftId(recoveryDocumentRef.current);
    }
    editor.commands.setContent(snapshot.contentHTML, { emitUpdate: false });
    for (const name of ["title", "subtitle", "category", "cover", "coverMedium"]) {
      setters[`set${name[0].toUpperCase()}${name.slice(1)}`](snapshot[name]);
    }
    recoveryRef.current = null;
    setRecovery(null);
    // Restoring is local only. Explicit Save/Publish opts back into server writes.
    recoveryHoldRef.current = true;
    setRecoveryNeedsSave(true);
    setIsDirty(true);
    return true;
  }, [editor, isDraftLoading, storage, offerRecovery, documentId, setIsDirty]);

  // Runs inside every transaction attempt against the article as just read.
  const checkEditToken = (prev) => {
    const { base, force } = editTokenRef.current;
    if (!force && base !== UNKNOWN_BASE && (prev.editToken ?? null) !== base) throw new EditConflictError();
  };
  const reserveEditToken = () => {
    const token = newEditToken();
    editTokenRef.current.own.add(token);
    return token;
  };
  const acceptEditToken = (token, savedSession) => {
    if (sessionRef.current !== savedSession) return;
    editTokenRef.current = { ...editTokenRef.current, base: token, force: false };
  };
  const reportConflict = (e) => {
    if (e?.code !== "edit-conflict") return false;
    if (!conflictRef.current) toast("다른 곳에서 이 글이 수정되어 저장을 멈췄어요. 어떻게 할지 선택해 주세요.");
    setConflict({ source: "save", at: Date.now() });
    return true;
  };

  // The editor keeps its text; the next save may replace the newer server copy.
  const overwriteConflict = useCallback(() => {
    editTokenRef.current.force = true;
    setConflict(null);
  }, [setConflict]);

  // Fed by a live listener on the open article; flags writes made elsewhere before the next save.
  const noteRemoteEditToken = useCallback((articleId, token) => {
    if (!articleId || articleId !== draftIdRef.current) return;
    const value = token ?? null;
    const current = editTokenRef.current;
    if (current.base === UNKNOWN_BASE) { current.base = value; return; }
    if (value === current.base || current.own.has(value) || current.force) return;
    if (!conflictRef.current) setConflict({ source: "remote", at: Date.now() });
  }, [setConflict]);

  const finishSave = useCallback((savedRevision, savedSession, oldKey, record, targetId, meta, markClean) => {
    if (sessionRef.current !== savedSession) return false;
    setLastAutoSavedAt(Date.now());
    draftIdRef.current = targetId;
    setDraftId(targetId);
    const unchanged = revisionRef.current === savedRevision;
    if (unchanged) {
      removeRecovery(storage, oldKey, record?.token);
      if (markClean) setIsDirty(false);
      recoveryHoldRef.current = false;
      setRecoveryNeedsSave(false);
    }
    keyRef.current = recoveryKey(userId, targetId);
    if (!unchanged) {
      const newer = captureRecovery(autosaveRef.current.meta || meta);
      // Move a new-document snapshot only after its newer copy is durable.
      if (newer && oldKey !== keyRef.current) {
        const oldRecord = readRecovery(storage, oldKey);
        if (oldRecord?.snapshot && JSON.stringify(oldRecord.snapshot) === JSON.stringify(newer.snapshot)) {
          removeRecovery(storage, oldKey, oldRecord.token);
        }
      }
    }
    return unchanged;
  }, [storage, userId, captureRecovery, setIsDirty]);

  const saveDraft = useCallback(
    async ({ silent = false, markClean = false, autosave = false } = {}, meta) => {
      if (!editor || editor.isDestroyed || !canWrite || savingRef.current || autosaveRef.current.loading || recoveryRef.current || (autosave && (recoveryHoldRef.current || conflictRef.current))) return false;
      savingRef.current = true;
      const savedRevision = revisionRef.current;
      const savedSession = sessionRef.current;
      const oldKey = keyRef.current;
      const record = captureRecovery(meta) || readRecovery(storage, oldKey);
      const editToken = reserveEditToken();
      const payload = { ...articlePayload(meta, editor.getHTML()), editToken };
      const currentId = draftIdRef.current;
      // Allocate refs once, outside retryable callbacks; never create documents during a retry.
      const newRef = doc(collection(db, "articles"));
      setIsSaving(true);
      try {
        const safeAuthorEmail = String(authorEmail || "");
        if (!safeAuthorEmail) throw new Error("Missing author email");
        const history = reserveHistory(db, currentId || newRef.id, historyUserId);
        const targetId = await runTransaction(db, async (transaction) => {
          const ref = currentId ? doc(db, "articles", currentId) : newRef;
          const snap = currentId ? await transaction.get(ref) : null;
          if (currentId && !snap.exists()) throw new Error("Draft no longer exists");
          const prev = snap?.data() || {};
          if (currentId) checkEditToken(prev);
          const target = prev.status === "published" ? newRef : ref;
          const fields = {
            ...payload,
            author: prev.author || authorName || "Unknown",
            authorEmail: prev.authorEmail || safeAuthorEmail,
            updatedAt: serverTimestamp(),
          };
          if (!currentId || prev.status === "published") {
            transaction.set(target, {
              ...fields, status: "draft", likes: 0, views: 0,
              createdAt: serverTimestamp(),
              ...(prev.status === "published" ? {
                sourceArticleId: currentId, sourceEditionNo: prev.editionNo || null,
                sourceSortIndex: prev.sortIndex || null, editMode: "revision",
                revisionOf: currentId, revisionLabel: prev.title || "Untitled",
              } : {}),
            });
          } else {
            transaction.update(target, { ...fields, status: prev.status || "draft" });
          }
          if (history) {
            if (prev.status === "published") history(transaction, ref.id, prev.authorEmail, prev, "수정 전 원본", true);
            history(transaction, target.id, fields.authorEmail, payload, autosave ? "자동 저장" : "초안 저장");
          }
          return target.id;
        });
        acceptEditToken(editToken, savedSession);
        finishSave(savedRevision, savedSession, oldKey, record, targetId, meta, markClean);
        await pruneSavedHistory(db, historyUserId, currentId, targetId);
        if (!silent) toast("임시 저장 완료");
        await refreshDrafts();
        return true;
      } catch (e) {
        if (reportConflict(e)) return false;
        console.error("Save draft error:", e);
        if (!silent) toast("저장에 실패했어요. 변경사항을 유지하고 있으니 다시 저장해 주세요.");
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- token helpers only touch refs
    [db, editor, refreshDrafts, toast, canWrite, authorEmail, authorName, historyUserId, captureRecovery, storage, finishSave]
  );

  const publish = useCallback(
    async (meta) => {
      if (!editor || editor.isDestroyed || !canWrite || savingRef.current || autosaveRef.current.loading || recoveryRef.current) return false;
      if (!meta.title?.trim()) {
        toast("제목을 입력해야 합니다.");
        return false;
      }
      savingRef.current = true;
      const savedRevision = revisionRef.current;
      const savedSession = sessionRef.current;
      const oldKey = keyRef.current;
      const record = captureRecovery(meta) || readRecovery(storage, oldKey);
      const editToken = reserveEditToken();
      const payload = { ...articlePayload(meta, editor.getHTML()), editToken };
      const currentId = draftIdRef.current;
      const ref = currentId ? doc(db, "articles", currentId) : doc(collection(db, "articles"));
      const counterRef = doc(db, "counters", "articles");
      setIsSaving(true);
      try {
        if (!authorEmail) throw new Error("Missing author email");
        const history = reserveHistory(db, ref.id, historyUserId);
        const targetId = await runPublicationTransaction(db, counterRef, async (transaction, noteCounterRead) => {
          const snap = currentId ? await transaction.get(ref) : null;
          if (currentId && !snap.exists()) throw new Error("Draft no longer exists");
          const prev = snap?.data() || {};
          if (currentId) checkEditToken(prev);
          if (prev.sourceArticleId) {
            const sourceRef = doc(db, "articles", prev.sourceArticleId);
            const source = await transaction.get(sourceRef);
            if (!source.exists() || source.data().status !== "published" || sourceRef.id === ref.id) {
              throw new Error("Revision source no longer exists");
            }
            transaction.update(sourceRef, {
              ...payload, updatedAt: serverTimestamp(), lastRevisionPublishedAt: serverTimestamp(),
            });
            transaction.set(doc(db, "articleSummaries", sourceRef.id),
              buildArticleSummary({ ...source.data(), ...payload }, serverTimestamp()));
            if (history) {
              history(transaction, sourceRef.id, source.data().authorEmail, source.data(), "발행 전 원본", true);
              history(transaction, sourceRef.id, source.data().authorEmail, payload, "수정본 발행");
            }
            transaction.delete(ref);
            return sourceRef.id;
          }
          let edition = {};
          if (prev.status !== "published") {
            const counter = await transaction.get(counterRef);
            noteCounterRead(counter.exists() ? counter.data().lastIndex : undefined);
            let seed = [];
            if (!counter.exists()) {
              // Web SDK transactions accept document refs, not queries. Discover the seed
              // inside each attempt, then enroll the maximum document in its read set.
              const maximum = await getDocs(query(
                collection(db, "articles"), where("status", "==", "published"),
                orderBy("sortIndex", "desc"), limit(1)
              ));
              for (const candidate of maximum.docs) {
                const verified = await transaction.get(doc(db, "articles", candidate.id));
                if (verified.exists() && verified.data().status === "published") seed.push(verified.data());
              }
            }
            const { nextIndex, nextEditionNo } = nextEdition(counter.exists() ? counter.data() : null, seed);
            edition = { sortIndex: nextIndex, editionNo: nextEditionNo };
            transaction.set(counterRef, {
              lastIndex: nextIndex, articleId: ref.id, updatedAt: serverTimestamp(),
            });
          }
          const fields = {
            ...payload, ...edition, status: "published",
            author: prev.author || authorName || "Unknown",
            authorEmail: prev.authorEmail || authorEmail, updatedAt: serverTimestamp(),
          };
          if (currentId) transaction.update(ref, fields);
          else transaction.set(ref, {
            ...fields, likes: 0, views: 0, createdAt: serverTimestamp(),
          });
          transaction.set(doc(db, "articleSummaries", ref.id), buildArticleSummary({ ...prev, ...fields }, serverTimestamp()));
          if (history) {
            if (prev.status === "published") history(transaction, ref.id, prev.authorEmail, prev, "발행 전 원본", true);
            history(transaction, ref.id, fields.authorEmail, payload, "발행");
          }
          return ref.id;
        });
        acceptEditToken(editToken, savedSession);
        const unchanged = finishSave(savedRevision, savedSession, oldKey, record, targetId, meta, true);
        await pruneSavedHistory(db, historyUserId, targetId);
        toast("아티클이 발행되었습니다!");
        await refreshDrafts();
        if (unchanged && revisionRef.current === savedRevision && sessionRef.current === savedSession) {
          // Release the write guard before router navigation evaluates its blocker.
          savingRef.current = false;
          setIsSaving(false);
          navigate("/");
        } else if (sessionRef.current === savedSession) {
          toast("발행 후 추가한 변경사항은 아직 저장되지 않았어요.");
        }
        return true;
      } catch (e) {
        if (reportConflict(e)) return false;
        console.error("Publish error:", e);
        toast("발행에 실패했어요. 변경사항을 유지하고 있으니 다시 시도해 주세요.");
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- token helpers only touch refs
    [db, editor, refreshDrafts, toast, navigate, canWrite, authorEmail, authorName, historyUserId, captureRecovery, storage, finishSave]
  );

  // One deadline survives every render and keystroke; the callback reads the latest metadata.
  autosaveRef.current.save = saveDraft;
  const runAutosave = useCallback((meta) => {
    autosaveRef.current.meta = meta;
    captureRecovery(meta);
    if (autosaveRef.current.timer !== null || !canWrite || !editor) return;
    const generation = autosaveRef.current.generation;
    const tick = async () => {
      if (generation !== autosaveRef.current.generation) return;
      if (dirtyRef.current && !savingRef.current && !autosaveRef.current.loading && !recoveryHoldRef.current && !recoveryRef.current && !conflictRef.current) {
        await autosaveRef.current.save(
          { silent: true, markClean: true, autosave: true }, autosaveRef.current.meta
        );
      }
      if (generation === autosaveRef.current.generation) autosaveRef.current.timer = setTimeout(tick, AUTOSAVE_DELAY_MS);
    };
    autosaveRef.current.timer = setTimeout(tick, AUTOSAVE_DELAY_MS);
  }, [canWrite, editor, captureRecovery]);

  return {
    drafts,
    draftId,
    isDraftLoading,
    isSaving,
    isDirty,
    setIsDirty,
    holdAutosave,
    lastAutoSavedAt,
    setLastAutoSavedAt,
    refreshDrafts,
    startNewDraft,
    loadDraft,
    saveDraft,
    publish,
    runAutosave,
    recovery,
    conflict,
    overwriteConflict,
    noteRemoteEditToken,
    recoveryError,
    recoveryNeedsSave,
    captureRecovery,
    restoreRecovery,
    discardRecovery,
    hasUnsavedChanges: () => dirtyRef.current || savingRef.current,
    setDraftId: (id) => { draftIdRef.current = id; setDraftId(id); },
  };
}
