// src/hooks/useAdminUsers.js
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

export function useAdminUsers({ enabled }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    (async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "users"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(q);
        setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      } catch (e) {
        console.error("[useAdminUsers] error:", e);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  return { users, loading };
}
