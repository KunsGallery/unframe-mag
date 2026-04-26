import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

const EMPTY_ITEMS = [];

export function useMyAchievements(uid) {
  const uidKey = String(uid || "");
  const [state, setState] = useState({
    uid: "",
    items: [],
    loading: false,
  });

  const isCurrent = state.uid === uidKey;
  const items = uidKey && isCurrent ? state.items : EMPTY_ITEMS;
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const loading = uidKey ? !isCurrent || state.loading : false;

  useEffect(() => {
    if (!uidKey) return;

    const ref = collection(db, "users", uidKey, "achievements");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const nextItems = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setState({ uid: uidKey, items: nextItems, loading: false });
      },
      (error) => {
        console.error("[useMyAchievements] snapshot error:", error);
        setState({ uid: uidKey, items: [], loading: false });
      }
    );

    return () => unsub();
  }, [uidKey]);

  return { items, ids, loading };
}
