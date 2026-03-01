import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function usePollMeta(pollKey) {
  const [meta, setMeta] = useState({ closed: false });
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    if (!pollKey) return;

    setLoadingMeta(true);
    const ref = doc(db, "polls", String(pollKey));

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setMeta({ closed: false });
        } else {
          setMeta({ closed: !!snap.data()?.closed });
        }
        setLoadingMeta(false);
      },
      (e) => {
        console.error("[usePollMeta] snapshot error:", e);
        setMeta({ closed: false });
        setLoadingMeta(false);
      }
    );

    return () => unsub();
  }, [pollKey]);

  return { meta, loadingMeta };
}