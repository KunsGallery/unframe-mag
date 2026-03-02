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
  const d = date.getDay();
  return d === 0 || d === 6;
}

export async function ensureUserProfileIfMissing(user) {
  if (!user) return;

  const ref = doc(db, "users", user.uid);

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
      tierLabel: "BRONZE",
      tierColor: "#8b8b8b",
      streakCount: 0,
      lastVisitDate: null,
      visitDayCount: 0,
      commentCount: 0,
      shareCount: 0,
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

  const xpAdd = Number(
    typeof opts?.xp === "number" ? opts.xp : XP_RULES[type] || 0
  );

  const shouldProgressCount = opts?.uniqueOnlyCount === false ? false : true;

  // 1) event log
  await addDoc(collection(db, "users", user.uid, "events"), {
    type,
    meta: meta || {},
    bucket,
    weekend,
    createdAt: serverTimestamp(),
  });

  // 2) daily
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

  // 3) user + achievements/stickers
  const userRef = doc(db, "users", user.uid);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const data = userSnap.exists() ? userSnap.data() : {};

    const prevXP = Number(data?.xp || 0);
    const nextXP = prevXP + xpAdd;

    const prevVisit = data?.lastVisitDate || null;
    let nextStreak = Number(data?.streakCount || 0);
    let nextVisitDayCount = Number(data?.visitDayCount || 0);
    let nextCommentCount = Number(data?.commentCount || 0);
    let nextShareCount = Number(data?.shareCount || 0);

    const isNewVisitDay = prevVisit !== dayId;

    if (prevVisit === dayId) {
      // same day
    } else if (prevVisit === yesterday) {
      nextStreak += 1;
    } else {
      nextStreak = 1;
    }

    if (isNewVisitDay) nextVisitDayCount += 1;
    if (type === "comment" && shouldProgressCount) nextCommentCount += 1;
    if (type === "share" && shouldProgressCount) nextShareCount += 1;

    const tier = calcTierFromXP(nextXP);
    const level = calcLevelFromXP(nextXP);

    // ---- read all refs first ----
    const refsToCheck = [];

    const pushRef = (key, ref) => refsToCheck.push({ key, ref });

    if (isNewVisitDay) {
      pushRef("ach_first_visit", doc(db, "users", user.uid, "achievements", "ach_first_visit"));
      if (nextVisitDayCount === 7) {
        pushRef("visit_7", doc(db, "users", user.uid, "achievements", "visit_7"));
      }
      if (nextVisitDayCount === 30) {
        pushRef("visit_30", doc(db, "users", user.uid, "achievements", "visit_30"));
      }
    }

    if (type === "comment" && shouldProgressCount) {
      pushRef("ach_first_comment", doc(db, "users", user.uid, "achievements", "ach_first_comment"));
      pushRef("first_comment", doc(db, "users", user.uid, "stickers", "first_comment"));

      if (nextCommentCount === 10) {
        pushRef("comments_10", doc(db, "users", user.uid, "achievements", "comments_10"));
      }
      if (nextCommentCount === 30) {
        pushRef("comments_30", doc(db, "users", user.uid, "achievements", "comments_30"));
      }
      if (nextCommentCount === 100) {
        pushRef("comments_100", doc(db, "users", user.uid, "achievements", "comments_100"));
      }
    }

    if (type === "share" && shouldProgressCount) {
      pushRef("ach_first_share", doc(db, "users", user.uid, "achievements", "ach_first_share"));
      pushRef("first_share", doc(db, "users", user.uid, "stickers", "first_share"));

      if (nextShareCount === 5) {
        pushRef("shares_5", doc(db, "users", user.uid, "achievements", "shares_5"));
      }
      if (nextShareCount === 20) {
        pushRef("shares_20", doc(db, "users", user.uid, "achievements", "shares_20"));
      }
    }

    if (type === "vote") {
      pushRef("ach_poll_vote", doc(db, "users", user.uid, "achievements", "ach_poll_vote"));
      pushRef("poll_voter", doc(db, "users", user.uid, "stickers", "poll_voter"));
    }

    const checked = {};
    for (const item of refsToCheck) {
      checked[item.key] = await tx.get(item.ref);
    }

    // ---- now write ----
    tx.set(
      userRef,
      {
        xp: nextXP,
        level,
        tier: tier.key,
        tierLabel: tier.label,
        tierColor: tier.color,
        lastActiveAt: serverTimestamp(),
        lastVisitDate: dayId,
        streakCount: nextStreak,
        streakUpdatedAt: serverTimestamp(),
        visitDayCount: nextVisitDayCount,
        commentCount: nextCommentCount,
        shareCount: nextShareCount,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (isNewVisitDay) {
      if (!checked.ach_first_visit?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "ach_first_visit"), {
          achievementId: "ach_first_visit",
          createdAt: serverTimestamp(),
        });
      }

      if (nextVisitDayCount === 7 && !checked.visit_7?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "visit_7"), {
          achievementId: "visit_7",
          createdAt: serverTimestamp(),
        });
      }

      if (nextVisitDayCount === 30 && !checked.visit_30?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "visit_30"), {
          achievementId: "visit_30",
          createdAt: serverTimestamp(),
        });
      }
    }

    if (type === "comment" && shouldProgressCount) {
      if (!checked.ach_first_comment?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "ach_first_comment"), {
          achievementId: "ach_first_comment",
          createdAt: serverTimestamp(),
        });
      }

      if (!checked.first_comment?.exists()) {
        tx.set(doc(db, "users", user.uid, "stickers", "first_comment"), {
          stickerId: "first_comment",
          createdAt: serverTimestamp(),
        });
      }

      if (nextCommentCount === 10 && !checked.comments_10?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "comments_10"), {
          achievementId: "comments_10",
          createdAt: serverTimestamp(),
        });
      }

      if (nextCommentCount === 30 && !checked.comments_30?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "comments_30"), {
          achievementId: "comments_30",
          createdAt: serverTimestamp(),
        });
      }

      if (nextCommentCount === 100 && !checked.comments_100?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "comments_100"), {
          achievementId: "comments_100",
          createdAt: serverTimestamp(),
        });
      }
    }

    if (type === "share" && shouldProgressCount) {
      if (!checked.ach_first_share?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "ach_first_share"), {
          achievementId: "ach_first_share",
          createdAt: serverTimestamp(),
        });
      }

      if (!checked.first_share?.exists()) {
        tx.set(doc(db, "users", user.uid, "stickers", "first_share"), {
          stickerId: "first_share",
          createdAt: serverTimestamp(),
        });
      }

      if (nextShareCount === 5 && !checked.shares_5?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "shares_5"), {
          achievementId: "shares_5",
          createdAt: serverTimestamp(),
        });
      }

      if (nextShareCount === 20 && !checked.shares_20?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "shares_20"), {
          achievementId: "shares_20",
          createdAt: serverTimestamp(),
        });
      }
    }

    if (type === "vote") {
      if (!checked.ach_poll_vote?.exists()) {
        tx.set(doc(db, "users", user.uid, "achievements", "ach_poll_vote"), {
          achievementId: "ach_poll_vote",
          createdAt: serverTimestamp(),
        });
      }

      if (!checked.poll_voter?.exists()) {
        tx.set(doc(db, "users", user.uid, "stickers", "poll_voter"), {
          stickerId: "poll_voter",
          createdAt: serverTimestamp(),
        });
      }
    }
  });
}

export async function trackEventOnce(type, flagId, meta = {}, opts = {}) {
  const user = auth.currentUser;
  if (!user || !flagId) return;

  const flagRef = doc(db, "users", user.uid, "xpFlags", flagId);
  let shouldAwardXP = false;

  await runTransaction(db, async (tx) => {
    const flagSnap = await tx.get(flagRef);

    if (!flagSnap.exists()) {
      tx.set(flagRef, {
        type,
        createdAt: serverTimestamp(),
      });
      shouldAwardXP = true;
    }
  });

  await trackEvent(type, meta, {
    ...opts,
    xp: shouldAwardXP ? opts?.xp : 0,
    uniqueOnlyCount: shouldAwardXP,
  });
}