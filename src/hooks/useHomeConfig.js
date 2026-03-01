import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useHomeConfig() {
  const [config, setConfig] = useState({ heroEditionNo: null, editorPicks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "config", "home");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setConfig({ heroEditionNo: null, editorPicks: [] });
        } else {
          const data = snap.data() || {};
          setConfig({
            heroEditionNo: data.heroEditionNo || null,
            editorPicks: Array.isArray(data.editorPicks) ? data.editorPicks : [],
          });
        }
        setLoading(false);
      },
      (e) => {
        console.error("[useHomeConfig] error:", e);
        setConfig({ heroEditionNo: null, editorPicks: [] });
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { config, loading };
}