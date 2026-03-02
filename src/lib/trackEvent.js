// src/lib/trackEvent.js
import {
  doc,
  setDoc,
  runTransaction,
  serverTimestamp,
  increment,
  collection,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { XP_RULES } from "../data/xpRules";
import { calcTierFromXP, calcLevelFromXP } from "./tierUtils";

function yyyymmddLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function yyyymmddLocalMinus(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return yyyymmddLocal(dt);
}

function timeBucketLocal(date = new Date()) {
  const h = date.getHours();
  if (h >= 0 && h < 6) return "night";
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

function isWeekendLocal(date = new Date()) {
  const d = date.getDay(); // 0 Sun ~ 6 Sat
  return d === 0 || d === 6;
}

export async function ensureUserProfileIfMissing(user) {
  if (!user) return;
  const ref = doc(db, "users", user.uid);

  // create는 rules에서 nicknameChanged=false 필요 → 최초 생성만 여기서 해줌
  // 이미 있으면 merge로 영향 거의 없음
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email || null,
      nickname: user.displayName || "U# User",
      nicknameChanged: false,
      role: "user",
      xp: 0,
      level: 1,
      tier: "BRONZE",
      tierColor: "#8b8b8b",
      streakCount: 0,
      lastVisitDate: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function trackEvent(type, meta = {}, opts = {}) {
  const user = auth.currentUser;
  if (!user) return;

  const now = new Date();
  const dayId = yyyymmddLocal(now);
  const yesterday = yyyymmddLocalMinus(1);
  const bucket = timeBucketLocal(now);
  const weekend = isWeekendLocal(now);

  // ✅ opts.xp가 숫자면 그 값을 사용, 아니면 XP_RULES에서 기본값 사용
  const xpAdd = Number(
    typeof opts?.xp === "number" ? opts.xp : (XP_RULES[type] || 0)
  );

  // 1) 이벤트 로그
  await addDoc(collection(db, "users", user.uid, "events"), {
    type,
    meta: meta || {},
    bucket,     // night/morning/afternoon/evening
    weekend,    // true/false
    createdAt: serverTimestamp(),
  });

  // 2) daily 카운트(증가)
  const dailyRef = doc(db, "users", user.uid, "daily", dayId);
  const delta = {};
  if (type === "view") delta.views = increment(1);
  if (type === "like") delta.likes = increment(1);
  if (type === "comment") delta.comments = increment(1);
  if (type === "vote") delta.votes = increment(1);
  if (type === "save") delta.saves = increment(1);
  if (type === "share") delta.shares = increment(1);

  await setDoc(
    dailyRef,
    {
      ...delta,
      updatedAt: serverTimestamp(),
      bucket,
      weekend,
    },
    { merge: true }
  );

  // 3) 유저 본문 업데이트(트랜잭션: streak/xp/level/tier)
  const userRef = doc(db, "users", user.uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists() ? snap.data() : {};

    const prevXP = Number(data?.xp || 0);
    const nextXP = prevXP + xpAdd;

    const prevVisit = data?.lastVisitDate || null;
    let nextStreak = Number(data?.streakCount || 0);

    if (prevVisit === dayId) {
      // 같은 날 재방문: streak 변화 없음
    } else if (prevVisit === yesterday) {
      nextStreak = nextStreak + 1;
    } else {
      nextStreak = 1;
    }

    const tier = calcTierFromXP(nextXP);
    const level = calcLevelFromXP(nextXP);

    tx.set(
      userRef,
      {
        xp: nextXP,
        level,
        tier: tier.label,
        tierColor: tier.color,
        lastActiveAt: serverTimestamp(),
        lastVisitDate: dayId,
        streakCount: nextStreak,
        streakUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}