import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// 편집 중인 글(articles/{id})의 메타를 한 번 읽어옵니다.
export function useEditorDocMeta(draftId, articleId) {
  const [editorDocMeta, setEditorDocMeta] = useState(null);
  const [loadingEditorMeta, setLoadingEditorMeta] = useState(false);

  useEffect(() => {
    const currentId = draftId || articleId;
    if (!currentId) {
      setEditorDocMeta(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingEditorMeta(true);
        const snap = await getDoc(doc(db, "articles", currentId));
        if (cancelled) return;

        if (snap.exists()) {
          setEditorDocMeta({ id: snap.id, ...snap.data() });
        } else {
          setEditorDocMeta(null);
        }
      } catch (e) {
        console.error("[EditorPage] meta load failed:", e);
        if (!cancelled) setEditorDocMeta(null);
      } finally {
        if (!cancelled) setLoadingEditorMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftId, articleId]);

  return { editorDocMeta, setEditorDocMeta, loadingEditorMeta };
}
