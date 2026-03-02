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

export function useDrafts({
  db,
  editor,
  canWrite = false,   // admin/editor
  isAdmin = false,    // admin only
  authorEmail = "",   // ✅ 권한 기준
  authorName = "",    // 표시용
  onToast,
  navigate,
}) {
  const toast = (msg) => (onToast ? onToast(msg) : console.log(msg));

  const [drafts, setDrafts] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);

  const refreshDrafts = useCallback(async () => {
    if (!canWrite) return;

    try {
      const base = [
        collection(db, "articles"),
        where("status", "==", "draft"),
        orderBy("createdAt", "desc"),
        limit(50),
      ];

      // ✅ admin: draft 전체
      // ✅ editor: 내 draft만
      const q = isAdmin
        ? query(...base)
        : query(
            collection(db, "articles"),
            where("status", "==", "draft"),
            where("authorEmail", "==", String(authorEmail || "")),
            orderBy("createdAt", "desc"),
            limit(50)
          );

      const snap = await getDocs(q);
      setDrafts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Draft list error:", e);
    }
  }, [db, canWrite, isAdmin, authorEmail]);

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
        const data = s.data() || {};

        // editor는 본인 글만
        if (!isAdmin && String(data.authorEmail || "") !== String(authorEmail || "")) {
          toast("이 초안에 접근할 권한이 없어요.");
          return;
        }

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
    [db, editor, toast, isAdmin, authorEmail]
  );

  const startNewDraft = useCallback(
    (setters) => {
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
    },
    [editor, toast]
  );

  const saveDraft = useCallback(
    async ({ silent = false, markClean = false } = {}, meta) => {
      if (!editor || !canWrite) return;
      setIsSaving(true);

      try {
        const contentHTML = editor.getHTML();

        const safeAuthorEmail = String(meta.authorEmail || authorEmail || "");
        const safeAuthorName = String(meta.author || authorName || "Unknown");

        if (!safeAuthorEmail) {
          toast("로그인 이메일이 없어 저장할 수 없어요.");
          return;
        }

        if (!draftId) {
          const docRef = await addDoc(collection(db, "articles"), {
            title: meta.title,
            subtitle: meta.subtitle,
            contentHTML,
            category: meta.category,
            cover: meta.cover,
            coverMedium: meta.coverMedium,

            status: "draft",
            likes: 0,
            views: 0,
            tags: [],

            author: safeAuthorName,
            authorEmail: safeAuthorEmail,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setDraftId(docRef.id);
          if (!silent) toast("임시 저장 완료");
          await refreshDrafts();
          if (markClean) setIsDirty(false);
          return;
        }

        await updateDoc(doc(db, "articles", draftId), {
          title: meta.title,
          subtitle: meta.subtitle,
          contentHTML,
          category: meta.category,
          cover: meta.cover,
          coverMedium: meta.coverMedium,

          status: "draft",
          author: safeAuthorName,
          authorEmail: safeAuthorEmail,

          updatedAt: serverTimestamp(),
        });

        if (!silent) toast("임시 저장 완료");
        await refreshDrafts();
        if (markClean) setIsDirty(false);
      } catch (e) {
        console.error("Save draft error:", e);
        if (!silent) toast("저장 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
    },
    [db, editor, draftId, refreshDrafts, toast, canWrite, authorEmail, authorName]
  );

  const getNextEditionInfo = useCallback(async () => {
   // ✅ published만 대상으로 번호 매기기 (editor 권한/쿼리 권한 문제 해결)
    const q = query(
      collection(db, "articles"),
      where("status", "==", "published"),
      orderBy("sortIndex", "desc"),
      limit(1)
    );

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
      if (!editor || !canWrite) return;

      if (!meta.title?.trim()) {
        toast("제목을 입력해야 합니다.");
        return;
      }

      setIsSaving(true);
      try {
        const contentHTML = editor.getHTML();

        const safeAuthorEmail = String(meta.authorEmail || authorEmail || "");
        const safeAuthorName = String(meta.author || authorName || "Unknown");

        if (!safeAuthorEmail) {
          toast("로그인 이메일이 없어 발행할 수 없어요.");
          return;
        }

        let targetId = draftId;

        if (!targetId) {
          const docRef = await addDoc(collection(db, "articles"), {
            title: meta.title,
            subtitle: meta.subtitle,
            contentHTML,
            category: meta.category,
            cover: meta.cover,
            coverMedium: meta.coverMedium,

            status: "draft",
            likes: 0,
            views: 0,
            tags: [],

            author: safeAuthorName,
            authorEmail: safeAuthorEmail,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          targetId = docRef.id;
          setDraftId(targetId);
        } else {
          await updateDoc(doc(db, "articles", targetId), {
            title: meta.title,
            subtitle: meta.subtitle,
            contentHTML,
            category: meta.category,
            cover: meta.cover,
            coverMedium: meta.coverMedium,

            author: safeAuthorName,
            authorEmail: safeAuthorEmail,

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
    [db, editor, draftId, getNextEditionInfo, refreshDrafts, toast, navigate, canWrite, authorEmail, authorName]
  );

  const runAutosave = useCallback(
    (meta) => {
      if (!editor || !canWrite) return;
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
    [editor, canWrite, isDirty, isSaving, isDraftLoading, saveDraft]
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