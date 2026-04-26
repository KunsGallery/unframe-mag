import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

const DEFAULT_META = { closed: false };

export function usePollMeta(pollKey) {
  const key = pollKey ? String(pollKey) : "";
  const [state, setState] = useState({
    key: "",
    meta: DEFAULT_META,
    loading: false,
  });

  const isCurrent = state.key === key;
  const meta = key && isCurrent ? state.meta : DEFAULT_META;
  const loadingMeta = key ? !isCurrent || state.loading : false;

  useEffect(() => {
    if (!key) return;

    const ref = doc(db, "polls", key);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setState({
          key,
          meta: snap.exists() ? { closed: !!snap.data()?.closed } : DEFAULT_META,
          loading: false,
        });
      },
      (e) => {
        console.error("[usePollMeta] snapshot error:", e);
        setState({ key, meta: DEFAULT_META, loading: false });
      }
    );

    return () => unsub();
  }, [key]);

  return { meta, loadingMeta };
}
