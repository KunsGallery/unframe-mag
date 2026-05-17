import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useUserProfiles(uids = []) {
  const [profiles, setProfiles] = useState({});

  const key = useMemo(() => {
    const unique = [...new Set((uids || []).map((uid) => String(uid || "").trim()).filter(Boolean))];
    unique.sort();
    return unique.join("|");
  }, [uids]);

  useEffect(() => {
    const unique = key ? key.split("|").filter(Boolean) : [];

    if (unique.length === 0) {
      setProfiles({});
      return;
    }

    setProfiles({});

    const unsubs = unique.map((uid) => {
      const ref = doc(db, "users", uid);
      return onSnapshot(
        ref,
        (snap) => {
          setProfiles((prev) => ({
            ...prev,
            [uid]: snap.exists() ? { uid: snap.id, ...snap.data() } : null,
          }));
        },
        (e) => {
          console.error("[useUserProfiles] snapshot error:", e);
          setProfiles((prev) => ({
            ...prev,
            [uid]: null,
          }));
        }
      );
    });

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [key]);

  return { profiles };
}
