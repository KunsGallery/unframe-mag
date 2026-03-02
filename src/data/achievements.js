// src/data/achievements.js

/**
 * 업적 메타 마스터
 *
 * 설계 원칙
 * 1) 기존 필드(name/title, xpReward/xpBonus) 하위호환 유지
 * 2) 앞으로 UI에서 바로 쓰기 좋도록 category / rarity / icon 추가
 * 3) Firestore에 이미 저장됐을 수 있는 구버전 id도 legacyIds로 흡수
 */

function defineAchievement({
  id,
  title,
  desc,
  xpReward = 0,
  xpBonus,
  stickerRewardId = null,
  category = "general",
  rarity = "common", // common | rare | epic | legendary
  icon = "✦",
  hidden = false,
  legacyIds = [],
}) {
  const finalXp = typeof xpBonus === "number" ? xpBonus : xpReward;

  return {
    id,

    // 하위호환
    title,
    name: title,
    desc,
    xpReward: finalXp,
    xpBonus: finalXp,

    // 확장 메타
    stickerRewardId,
    category,
    rarity,
    icon,
    hidden,
    legacyIds,
  };
}

export const ACHIEVEMENTS = [
  // ---------------------------------------------------------------------------
  // FIRST ACTIONS
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "ach_first_comment",
    title: "First Comment",
    desc: "첫 댓글",
    xpReward: 20,
    stickerRewardId: "first_comment",
    category: "comment",
    rarity: "common",
    icon: "💬",
    legacyIds: ["first_comment"],
  }),

  defineAchievement({
    id: "ach_first_save",
    title: "First Save",
    desc: "첫 저장",
    xpReward: 10,
    stickerRewardId: "first_save",
    category: "save",
    rarity: "common",
    icon: "🔖",
    legacyIds: ["first_save"],
  }),

  defineAchievement({
    id: "ach_poll_vote",
    title: "First Vote",
    desc: "첫 투표",
    xpReward: 10,
    stickerRewardId: "poll_voter",
    category: "vote",
    rarity: "common",
    icon: "🗳️",
    legacyIds: ["first_vote", "poll_vote"],
  }),

  defineAchievement({
    id: "ach_first_share",
    title: "First Share",
    desc: "첫 공유",
    xpReward: 15,
    stickerRewardId: "first_share",
    category: "share",
    rarity: "common",
    icon: "📤",
    legacyIds: ["first_share"],
  }),

  defineAchievement({
    id: "ach_first_visit",
    title: "First Visit",
    desc: "첫 방문",
    xpReward: 5,
    stickerRewardId: "first_visit",
    category: "visit",
    rarity: "common",
    icon: "👣",
    legacyIds: ["first_visit"],
  }),

  // ---------------------------------------------------------------------------
  // STREAK
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "streak_7",
    title: "7 Days Streak",
    desc: "연속 출석 7일",
    xpBonus: 50,
    category: "streak",
    rarity: "rare",
    icon: "🔥",
  }),

  defineAchievement({
    id: "streak_30",
    title: "30 Days Streak",
    desc: "연속 출석 30일",
    xpBonus: 200,
    category: "streak",
    rarity: "epic",
    icon: "🔥",
  }),

  defineAchievement({
    id: "streak_100",
    title: "100 Days Streak",
    desc: "연속 출석 100일",
    xpBonus: 600,
    category: "streak",
    rarity: "legendary",
    icon: "🌋",
  }),

  // ---------------------------------------------------------------------------
  // COMMENTS
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "comments_10",
    title: "10 Comments",
    desc: "댓글 10개",
    xpBonus: 80,
    category: "comment",
    rarity: "rare",
    icon: "💬",
  }),

  defineAchievement({
    id: "comments_30",
    title: "30 Comments",
    desc: "댓글 30개",
    xpBonus: 180,
    category: "comment",
    rarity: "epic",
    icon: "📝",
  }),

  defineAchievement({
    id: "comments_100",
    title: "100 Comments",
    desc: "댓글 100개",
    xpBonus: 500,
    category: "comment",
    rarity: "legendary",
    icon: "🗣️",
  }),

  // ---------------------------------------------------------------------------
  // SAVES
  // Firestore에는 save_10 으로 생성됐을 가능성이 높으므로 legacyIds로 흡수
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "save_10",
    title: "10 Saves",
    desc: "유니크 저장 10개",
    xpBonus: 80,
    category: "save",
    rarity: "rare",
    icon: "🔖",
    legacyIds: ["saves_10"],
  }),

  defineAchievement({
    id: "save_50",
    title: "50 Saves",
    desc: "유니크 저장 50개",
    xpBonus: 220,
    category: "save",
    rarity: "epic",
    icon: "📚",
    legacyIds: ["saves_50"],
  }),

  defineAchievement({
    id: "save_100",
    title: "100 Saves",
    desc: "유니크 저장 100개",
    xpBonus: 500,
    category: "save",
    rarity: "legendary",
    icon: "🏛️",
    legacyIds: ["saves_100"],
  }),

  // ---------------------------------------------------------------------------
  // VOTES
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "votes_10",
    title: "10 Votes",
    desc: "투표 10회",
    xpBonus: 70,
    category: "vote",
    rarity: "rare",
    icon: "🗳️",
  }),

  defineAchievement({
    id: "votes_30",
    title: "30 Votes",
    desc: "투표 30회",
    xpBonus: 160,
    category: "vote",
    rarity: "epic",
    icon: "📊",
  }),

  // ---------------------------------------------------------------------------
  // SHARES
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "shares_5",
    title: "5 Shares",
    desc: "공유 5회",
    xpBonus: 60,
    category: "share",
    rarity: "rare",
    icon: "📤",
  }),

  defineAchievement({
    id: "shares_20",
    title: "20 Shares",
    desc: "공유 20회",
    xpBonus: 180,
    category: "share",
    rarity: "epic",
    icon: "🚀",
  }),

  // ---------------------------------------------------------------------------
  // VISITS / READING
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "visit_7",
    title: "7 Visits",
    desc: "7일 이상 방문",
    xpBonus: 40,
    category: "visit",
    rarity: "common",
    icon: "👣",
  }),

  defineAchievement({
    id: "visit_30",
    title: "30 Visits",
    desc: "30일 이상 방문",
    xpBonus: 150,
    category: "visit",
    rarity: "epic",
    icon: "🧭",
  }),

  defineAchievement({
    id: "views_10",
    title: "10 Articles Read",
    desc: "아티클 10개 열람",
    xpBonus: 40,
    category: "reading",
    rarity: "common",
    icon: "📖",
  }),

  defineAchievement({
    id: "views_50",
    title: "50 Articles Read",
    desc: "아티클 50개 열람",
    xpBonus: 140,
    category: "reading",
    rarity: "rare",
    icon: "📚",
  }),

  defineAchievement({
    id: "views_100",
    title: "100 Articles Read",
    desc: "아티클 100개 열람",
    xpBonus: 320,
    category: "reading",
    rarity: "epic",
    icon: "🕯️",
  }),

  // ---------------------------------------------------------------------------
  // SPECIAL / FUTURE
  // 아직 UI/기능은 없더라도 미리 마스터에 올려둘 수 있는 것들
  // hidden=true 면 추후 비공개 업적처럼 활용 가능
  // ---------------------------------------------------------------------------
  defineAchievement({
    id: "night_owl",
    title: "Night Owl",
    desc: "심야 시간대에 꾸준히 활동",
    xpBonus: 70,
    category: "time",
    rarity: "rare",
    icon: "🌙",
    hidden: true,
  }),

  defineAchievement({
    id: "weekend_wanderer",
    title: "Weekend Wanderer",
    desc: "주말에 활발히 활동",
    xpBonus: 70,
    category: "time",
    rarity: "rare",
    icon: "🗓️",
    hidden: true,
  }),

  defineAchievement({
    id: "longform_reader",
    title: "Longform Reader",
    desc: "긴 글을 꾸준히 읽는 독자",
    xpBonus: 100,
    category: "reading",
    rarity: "epic",
    icon: "📰",
    hidden: true,
  }),
];

/**
 * id → achievement 빠른 조회용 맵
 * legacyIds까지 모두 흡수
 */
export const ACHIEVEMENT_MAP = ACHIEVEMENTS.reduce((acc, achievement) => {
  acc[achievement.id] = achievement;

  if (Array.isArray(achievement.legacyIds)) {
    achievement.legacyIds.forEach((legacyId) => {
      acc[legacyId] = achievement;
    });
  }

  return acc;
}, {});

/**
 * 업적 메타 가져오기
 * 없는 id면 최소 fallback 반환
 */
export function getAchievementMeta(id) {
  if (!id) {
    return {
      id: "",
      title: "Unknown Achievement",
      name: "Unknown Achievement",
      desc: "알 수 없는 업적",
      xpReward: 0,
      xpBonus: 0,
      stickerRewardId: null,
      category: "general",
      rarity: "common",
      icon: "✦",
      hidden: false,
      legacyIds: [],
    };
  }

  return (
    ACHIEVEMENT_MAP[id] || {
      id,
      title: id,
      name: id,
      desc: "설명이 아직 등록되지 않은 업적입니다.",
      xpReward: 0,
      xpBonus: 0,
      stickerRewardId: null,
      category: "general",
      rarity: "common",
      icon: "✦",
      hidden: false,
      legacyIds: [],
    }
  );
}

/**
 * 카테고리별 필터링용
 */
export function getAchievementsByCategory(category) {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * 희귀도 정렬용 점수
 */
export const ACHIEVEMENT_RARITY_ORDER = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};