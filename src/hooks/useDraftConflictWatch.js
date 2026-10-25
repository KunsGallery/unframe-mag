import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";

// Watches the open article so a write from another tab, device or editor is
// flagged while typing, not only when the next save is refused.
export function useDraftConflictWatch(db, articleId, noteRemoteEditToken) {
  useEffect(() => {
    if (!db || !articleId || !noteRemoteEditToken) return undefined;
    return onSnapshot(doc(db, "articles", articleId), (snap) => {
      if (snap.exists() && !snap.metadata.hasPendingWrites) noteRemoteEditToken(articleId, snap.data().editToken);
    }, () => {});
  }, [db, articleId, noteRemoteEditToken]);
}
