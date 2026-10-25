// src/hooks/useAdminUsers.js
import { useEffect, useState } from "react";
import { collection, collectionGroup, getDocs, orderBy, query } from "firebase/firestore";
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
        const [snap, contacts] = await Promise.all([
          getDocs(q),
          // Emails live in users/{uid}/private/contact, readable only by admins.
          getDocs(collectionGroup(db, "private")).catch((e) => {
            console.warn("[useAdminUsers] contacts unavailable:", e);
            return { docs: [] };
          }),
        ]);
        const emails = new Map(
          contacts.docs
            .filter((d) => d.id === "contact" && d.ref.parent.parent)
            .map((d) => [d.ref.parent.parent.id, d.data().email])
        );
        setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data(), email: emails.get(d.id) || d.data().email || null })));
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
