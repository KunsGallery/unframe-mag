import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * 통합 인기글 롤업 훅
 *
 * ✅ 사용법(기존 호환):
 *  - usePopularRollup({ metric: "views7d", top: 5 })
 *  - usePopularRollup({ metric: "likes30d", top: 6 })
 *
 * ✅ 사용법(의미 기반):
 *  - usePopularRollup({ mode: "weekly", sortBy: "likes", top: 6 })  -> likes7d
 *  - usePopularRollup({ mode: "monthly", sortBy: "views", top: 6 }) -> views30d
 *
 * 반환:
 *  { items, loading, error, metricUsed, refetch }
 */
export function usePopularRollup({
  // (A) 기존 방식: metric 직접 지정
  metric,

  // (B) 의미 기반 방식
  mode = "weekly", // "weekly" | "monthly"
  sortBy = "likes", // "likes" | "views"

  // 공통
  top = 5,
  enabled = true,
} = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");

  // ✅ metric 결정 (metric이 있으면 그걸 최우선으로 사용)
  const metricUsed = useMemo(() => {
    if (metric) return String(metric);

    const isWeekly = String(mode) === "weekly";
    const isViews = String(sortBy) === "views";

    if (isWeekly) return isViews ? "views7d" : "likes7d";
    return isViews ? "views30d" : "likes30d";
  }, [metric, mode, sortBy]);

  const run = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "articles"),
        where("status", "==", "published"),
        orderBy(metricUsed, "desc"),
        limit(Number(top) || 5)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
      setItems(list);
    } catch (e) {
      console.error("[usePopularRollup] error:", e);
      setError(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, metricUsed, top]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await run();
    })();
    return () => {
      alive = false;
    };
  }, [run]);

  return {
    items,
    loading,
    error,
    metricUsed,
    refetch: run,
  };
}