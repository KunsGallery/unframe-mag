import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useMyAchievements(uid) {
  const [items, setItems] = useState([]);
  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = collection(db, "users", uid, "achievements");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const nextItems = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(nextItems);
        setIds(nextItems.map((item) => item.id));
        setLoading(false);
      },
      (error) => {
        console.error("[useMyAchievements] snapshot error:", error);
        setItems([]);
        setIds([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { items, ids, loading };
}