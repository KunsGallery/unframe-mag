import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useMyStickers(uid) {
  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = collection(db, "users", uid, "stickers");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next = snap.docs.map((doc) => doc.id);
        setIds(next);
        setLoading(false);
      },
      (error) => {
        console.error("[useMyStickers] snapshot error:", error);
        setIds([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { ids, loading };
}