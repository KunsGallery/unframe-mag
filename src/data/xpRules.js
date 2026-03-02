// src/lib/xpRules.js

// 이벤트 → XP
export const XP_RULES = {
  view: 1,
  like: 2,
  save: 3,
  comment: 6,
  vote: 4,
  share: 5,
};

// 티어/레벨 간단 버전(원하면 네 색상/명칭으로 바꿔도 됨)
export const TIERS = [
  { key: "BRONZE", label: "BRONZE", color: "#8b8b8b", minXP: 0 },
  { key: "SILVER", label: "SILVER", color: "#a7a7a7", minXP: 200 },
  { key: "GOLD", label: "GOLD", color: "#c7a038", minXP: 600 },
  { key: "DIAMOND", label: "DIAMOND", color: "#3ad0ff", minXP: 1400 },
];

export function calcTierFromXP(xp) {
  const v = Number(xp || 0);
  let current = TIERS[0];
  for (const t of TIERS) {
    if (v >= t.minXP) current = t;
  }
  return current;
}

export function calcLevelFromXP(xp) {
  // 아주 단순: 100xp = 1레벨
  const v = Number(xp || 0);
  return Math.max(1, Math.floor(v / 100) + 1);
}