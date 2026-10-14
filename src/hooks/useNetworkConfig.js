// src/hooks/useNetworkConfig.js
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { normalizeNetworkConfig } from "../lib/siteLinks";

export function useNetworkConfig() {
  const [config, setConfig] = useState(() => normalizeNetworkConfig(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = doc(db, "config", "network");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setConfig(normalizeNetworkConfig(snap.exists() ? snap.data() : null));
        setLoading(false);
        setError("");
      },
      (e) => {
        console.error("[useNetworkConfig] error:", e);
        setConfig(normalizeNetworkConfig(null));
        setLoading(false);
        setError(String(e?.message || e));
      }
    );

    return () => unsub();
  }, []);

  return { config, loading, error };
}
