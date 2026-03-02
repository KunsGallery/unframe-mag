// src/lib/tierUtils.js
import { TIERS } from "../data/tiers";

export function calcTierFromXP(xp = 0) {
  const v = Number(xp || 0);
  let current = TIERS[0];
  for (const t of TIERS) {
    if (v >= t.minXP) current = t;
  }
  return current;
}

export function calcLevelFromXP(xp = 0) {
  // 초간단 레벨 곡선(원하면 나중에 바꾸기 쉬움)
  const v = Math.max(0, Number(xp || 0));
  return Math.floor(v / 100) + 1;
}