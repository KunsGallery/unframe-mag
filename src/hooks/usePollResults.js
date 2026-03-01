import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function usePollResults(pollKey, optionIds = []) {
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const base = useMemo(() => {
    const init = {};
    for (const id of optionIds) init[id] = 0;
    return init;
  }, [optionIds]);

  useEffect(() => {
    if (!pollKey) return;

    setLoading(true);
    const ref = collection(db, "polls", String(pollKey), "votes");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next = { ...base };
        let t = 0;
        snap.forEach((d) => {
          const v = d.data();
          const opt = v?.optionId;
          if (opt) {
            next[opt] = (next[opt] || 0) + 1;
            t += 1;
          }
        });
        setCounts(next);
        setTotal(t);
        setLoading(false);
      },
      (e) => {
        console.error("[usePollResults] snapshot error:", e);
        setCounts(base);
        setTotal(0);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [pollKey, base]);

  const percentOf = (optionId) => {
    if (!total) return 0;
    return Math.round(((counts[optionId] || 0) / total) * 100);
  };

  return { counts, total, loading, percentOf };
}