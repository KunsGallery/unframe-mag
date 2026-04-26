import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

const EMPTY_OPTION_IDS = [];

export function usePollResults(pollKey, optionIds = EMPTY_OPTION_IDS) {
  const key = pollKey ? String(pollKey) : "";
  const optionKey = optionIds.join("|");

  const base = useMemo(() => {
    const init = {};
    for (const id of optionIds) init[id] = 0;
    return init;
  }, [optionIds]);

  const [state, setState] = useState({
    key: "",
    optionKey: "",
    counts: {},
    total: 0,
    loading: false,
  });

  const isCurrent = state.key === key && state.optionKey === optionKey;
  const counts = key && isCurrent ? state.counts : base;
  const total = key && isCurrent ? state.total : 0;
  const loading = key ? !isCurrent || state.loading : false;

  useEffect(() => {
    if (!key) return;

    const ref = collection(db, "polls", key, "votes");

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
        setState({ key, optionKey, counts: next, total: t, loading: false });
      },
      (e) => {
        console.error("[usePollResults] snapshot error:", e);
        setState({ key, optionKey, counts: base, total: 0, loading: false });
      }
    );

    return () => unsub();
  }, [key, optionKey, base]);

  const percentOf = (optionId) => {
    if (!total) return 0;
    return Math.round(((counts[optionId] || 0) / total) * 100);
  };

  return { counts, total, loading, percentOf };
}
