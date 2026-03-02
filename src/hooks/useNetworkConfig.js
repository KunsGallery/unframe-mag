// src/hooks/useNetworkConfig.js
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useNetworkConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = doc(db, "config", "network");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setConfig(snap.exists() ? snap.data() : null);
        setLoading(false);
        setError("");
      },
      (e) => {
        console.error("[useNetworkConfig] error:", e);
        setConfig(null);
        setLoading(false);
        setError(String(e?.message || e));
      }
    );

    return () => unsub();
  }, []);

  return { config, loading, error };
}