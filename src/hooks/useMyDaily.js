// src/hooks/useMyDaily.js
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase/config";

function yyyymmddLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function useMyDaily() {
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setToday(null);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", u.uid, "daily", yyyymmddLocal());
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setToday(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      () => {
        setToday(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { today, loading };
}