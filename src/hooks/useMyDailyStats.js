import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { yyyymmddLocal } from "../lib/myPageFormat";

// 로컬 기준 yyyymmdd 문서(users/{uid}/daily/{dayId})를 구독합니다.
export function useMyDailyStats(uid) {
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      // MyPage에서 옮겨온 기존 동작 그대로: 로그아웃/권한 없음일 때 즉시 초기화
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDaily(null);
      setDailyLoading(false);
      return;
    }

    const dayId = yyyymmddLocal(new Date());
    setDailyLoading(true);

    const ref = doc(db, "users", uid, "daily", dayId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setDaily(snap.exists() ? snap.data() : null);
        setDailyLoading(false);
      },
      (e) => {
        console.error("[MyPage] daily snapshot error:", e);
        setDaily(null);
        setDailyLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { daily, dailyLoading };
}
