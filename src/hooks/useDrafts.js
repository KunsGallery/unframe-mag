// src/hooks/useDrafts.js
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  where,
} from "firebase/firestore";

export function useDrafts({ db, editor, isAdmin, onToast, navigate }) {
  const toast = (msg) => (onToast ? onToast(msg) : console.log(msg));

  const [drafts, setDrafts] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // autosave meta
  const [isDirty, setIsDirty] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);

  const refreshDrafts = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const q = query(
        collection(db, "articles"),
        where("status", "==", "draft"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setDrafts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Draft list error:", e);
    }
  }, [db, isAdmin]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const loadDraft = useCallback(
    async (docId, setters) => {
      if (!editor) return;
      setIsDraftLoading(true);
      try {
        const ref = doc(db, "articles", docId);
        const s = await getDoc(ref);
        if (!s.exists()) {
          toast("초안을 찾을 수 없습니다.");
          return;
        }
        const data = s.data();

        setDraftId(docId);

        setters.setTitle(data.title || "");
        setters.setSubtitle(data.subtitle || "");
        setters.setCategory(data.category || "EDITORIAL");
        setters.setCover(data.cover || "");
        setters.setCoverMedium(data.coverMedium || "");

        editor.commands.setContent(data.contentHTML || "");

        setIsDirty(false);
        setLastAutoSavedAt(null);
      } catch (e) {
        console.error("Load draft error:", e);
        toast("초안 로딩 중 오류가 발생했습니다.");
      } finally {
        setIsDraftLoading(false);
      }
    },
    [db, editor, toast]
  );

  const startNewDraft = useCallback((setters) => {
    setDraftId(null);
    setters.setTitle("");
    setters.setSubtitle("");
    setters.setCategory("EDITORIAL");
    setters.setCover("");
    setters.setCoverMedium("");
    editor?.commands?.setContent("");

    setIsDirty(false);
    setLastAutoSavedAt(null);
    toast("새 초안을 시작합니다.");
  }, [editor, toast]);

  const saveDraft = useCallback(
    async ({ silent = false, markClean = false } = {}, meta) => {
      if (!editor) return;
      setIsSaving(true);

      const { title, subtitle, category, cover, coverMedium, author } = meta;
      try {
        const contentHTML = editor.getHTML();

        // 최초 저장: draft 문서 생성
        if (!draftId) {
          const docRef = await addDoc(collection(db, "articles"), {
            title,
            subtitle,
            contentHTML,
            category,
            cover,
            coverMedium,
            status: "draft",
            likes: 0,
            views: 0,
            tags: [],
            author: author?.name || "Admin",
            authorEmail: author?.email || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setDraftId(docRef.id);
          if (!silent) toast("임시 저장이 완료되었습니다.");
          await refreshDrafts();

          if (markClean) setIsDirty(false);
          return;
        }

        // 이후 저장: updateDoc
        await updateDoc(doc(db, "articles", draftId), {
          title,
          subtitle,
          contentHTML,
          category,
          cover,
          coverMedium,
          status: "draft",
          author: author?.name || "Admin",
          authorEmail: author?.email || "",
          updatedAt: serverTimestamp(),
        });

        if (!silent) toast("임시 저장이 완료되었습니다.");
        await refreshDrafts();

        if (markClean) setIsDirty(false);
      } catch (e) {
        console.error("Save draft error:", e);
        if (!silent) toast("저장 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
    },
    [db, editor, draftId, refreshDrafts, toast]
  );

  const getNextEditionInfo = useCallback(async () => {
    // ✅ 복합 인덱스 요구 방지: status 조건 제거
    const q = query(collection(db, "articles"), orderBy("sortIndex", "desc"), limit(1));
    const snap = await getDocs(q);

    let nextIndex = 1;
    if (!snap.empty) {
      const top = snap.docs[0].data().sortIndex;
      nextIndex = (typeof top === "number" ? top : 0) + 1;
    }

    const nextEditionNo = String(nextIndex).padStart(3, "0");
    return { nextIndex, nextEditionNo };
  }, [db]);

  const publish = useCallback(
    async (meta) => {
      if (!editor) return;
      const { title, subtitle, category, cover, coverMedium, author } = meta;

      if (!title.trim()) {
        toast("제목을 입력해야 합니다.");
        return;
      }

      setIsSaving(true);
      try {
        const contentHTML = editor.getHTML();

        // draft 없으면 생성 후 publish
        let targetId = draftId;
        if (!targetId) {
          const docRef = await addDoc(collection(db, "articles"), {
            title,
            subtitle,
            contentHTML,
            category,
            cover,
            coverMedium,
            status: "draft",
            likes: 0,
            views: 0,
            tags: [],
            author: author?.name || "Admin",
            authorEmail: author?.email || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          targetId = docRef.id;
          setDraftId(targetId);
        } else {
          await updateDoc(doc(db, "articles", targetId), {
            title,
            subtitle,
            contentHTML,
            category,
            cover,
            coverMedium,
            author: author?.name || "Admin",
            authorEmail: author?.email || "",
            updatedAt: serverTimestamp(),
          });
        }

        const { nextIndex, nextEditionNo } = await getNextEditionInfo();

        await updateDoc(doc(db, "articles", targetId), {
          status: "published",
          sortIndex: nextIndex,
          editionNo: nextEditionNo,
          updatedAt: serverTimestamp(),
        });

        toast("아티클이 발행되었습니다!");
        await refreshDrafts();

        setIsDirty(false);
        setLastAutoSavedAt(null);

        navigate("/");
      } catch (e) {
        console.error("Publish error:", e);
        toast("발행 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
    },
    [db, editor, draftId, getNextEditionInfo, refreshDrafts, toast, navigate]
  );

  // autosave debounce (호출쪽에서 meta를 넘겨줌)
  const runAutosave = useCallback(
    (meta) => {
      if (!editor || !isAdmin) return;

      if (!isDirty) return;
      if (isSaving || isDraftLoading) return;

      const hasAnything =
        meta.title.trim() ||
        meta.subtitle.trim() ||
        meta.cover.trim() ||
        meta.coverMedium.trim() ||
        editor.getText().trim();

      if (!hasAnything) return;

      const t = setTimeout(async () => {
        if (isSaving || isDraftLoading) return;
        await saveDraft({ silent: true, markClean: true }, meta);
        setLastAutoSavedAt(Date.now());
      }, 1500);

      return () => clearTimeout(t);
    },
    [editor, isAdmin, isDirty, isSaving, isDraftLoading, saveDraft]
  );

  return {
    drafts,
    draftId,
    isDraftLoading,
    isSaving,

    isDirty,
    setIsDirty,
    lastAutoSavedAt,
    setLastAutoSavedAt,

    refreshDrafts,
    startNewDraft,
    loadDraft,
    saveDraft,
    publish,

    runAutosave,
    setDraftId,
  };
}