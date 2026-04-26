import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useMyStickers(uid) {
  const uidKey = String(uid || "");
  const [state, setState] = useState({
    uid: "",
    ids: [],
    loading: false,
  });

  const isCurrent = state.uid === uidKey;
  const ids = uidKey && isCurrent ? state.ids : [];
  const loading = uidKey ? !isCurrent || state.loading : false;

  useEffect(() => {
    if (!uidKey) return;

    const ref = collection(db, "users", uidKey, "stickers");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next = snap.docs.map((doc) => doc.id);
        setState({ uid: uidKey, ids: next, loading: false });
      },
      (error) => {
        console.error("[useMyStickers] snapshot error:", error);
        setState({ uid: uidKey, ids: [], loading: false });
      }
    );

    return () => unsub();
  }, [uidKey]);

  return { ids, loading };
}
