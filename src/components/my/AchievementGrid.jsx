import React, { useMemo, useState } from "react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_RARITY_ORDER,
  getAchievementMeta,
} from "../../data/achievements";

function normalizeOwnedAchievements(items = []) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (typeof item === "string") {
      return {
        id: item,
        earnedAt: null,
      };
    }

    const rawId = item?.id || item?.achievementId || item?.key || "";
    const earnedAt =
      item?.earnedAt ||
      item?.createdAt ||
      item?.awardedAt ||
      item?.unlockedAt ||
      null;

    return {
      id: rawId,
      earnedAt,
      ...item,
    };
  });
}

function toDateText(value) {
  if (!value) return "";

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleDateString("ko-KR");
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("ko-KR");
    }
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("ko-KR");
    }
  } catch (_) {}

  return "";
}

function getRarityLabel(rarity) {
  switch (rarity) {
    case "legendary":
      return "Legendary";
    case "epic":
      return "Epic";
    case "rare":
      return "Rare";
    default:
      return "Common";
  }
}

function getCategoryLabel(category) {
  switch (category) {
    case "save":
      return "저장";
    case "comment":
      return "댓글";
    case "vote":
      return "투표";
    case "share":
      return "공유";
    case "visit":
      return "방문";
    case "streak":
      return "연속 출석";
    case "reading":
      return "읽기";
    case "time":
      return "시간대";
    default:
      return "기타";
  }
}

function rarityTone(rarity, unlocked) {
  if (!unlocked) {
    return "border-black/10 bg-black/[0.03] text-zinc-500 dark:border-zinc-800 dark:bg-white/[0.03] dark:text-zinc-500";
  }

  switch (rarity) {
    case "legendary":
      return "border-[#004aad]/30 bg-[#004aad]/10 text-black dark:text-white";
    case "epic":
      return "border-fuchsia-400/30 bg-fuchsia-400/10 text-black dark:text-white";
    case "rare":
      return "border-emerald-400/30 bg-emerald-400/10 text-black dark:text-white";
    default:
      return "border-black/10 bg-black/[0.03] text-black dark:border-zinc-800 dark:bg-white/[0.04] dark:text-white";
  }
}

function xpOf(achievement) {
  return achievement.xpReward || achievement.xpBonus || 0;
}

export default function AchievementGrid({
  ownedAchievements = [],
  showHidden = false,
  title = "Achievements",
}) {
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const ownedList = useMemo(
    () => normalizeOwnedAchievements(ownedAchievements),
    [ownedAchievements]
  );

  const ownedMap = useMemo(() => {
    const map = new Map();

    for (const item of ownedList) {
      if (!item?.id) continue;

      const meta = getAchievementMeta(item.id);
      map.set(meta.id, {
        ...meta,
        earnedAt: item.earnedAt || item.createdAt || null,
        raw: item,
      });
    }

    return map;
  }, [ownedList]);

  const allAchievements = useMemo(() => {
    const base = ACHIEVEMENTS.filter((a) => (showHidden ? true : !a.hidden));

    return [...base].sort((a, b) => {
      const aOwned = ownedMap.has(a.id) ? 1 : 0;
      const bOwned = ownedMap.has(b.id) ? 1 : 0;

      if (aOwned !== bOwned) return bOwned - aOwned;

      const rarityDiff =
        (ACHIEVEMENT_RARITY_ORDER[b.rarity] || 0) -
        (ACHIEVEMENT_RARITY_ORDER[a.rarity] || 0);
      if (rarityDiff !== 0) return rarityDiff;

      return a.title.localeCompare(b.title);
    });
  }, [ownedMap, showHidden]);

  const visibleAchievements = useMemo(() => {
    const filtered =
      filter === "all"
        ? allAchievements
        : allAchievements.filter((a) => a.category === filter);

    return showAll ? filtered : filtered.slice(0, 8);
  }, [allAchievements, filter, showAll]);

  const filteredCount = useMemo(() => {
    if (filter === "all") return allAchievements.length;
    return allAchievements.filter((a) => a.category === filter).length;
  }, [allAchievements, filter]);

  const stats = useMemo(() => {
    const total = allAchievements.length;
    const owned = allAchievements.filter((a) => ownedMap.has(a.id)).length;
    const percent = total > 0 ? Math.round((owned / total) * 100) : 0;

    return { total, owned, percent };
  }, [allAchievements, ownedMap]);

  const filters = [
    { key: "all", label: "전체" },
    { key: "save", label: "저장" },
    { key: "comment", label: "댓글" },
    { key: "vote", label: "투표" },
    { key: "share", label: "공유" },
    { key: "visit", label: "방문" },
    { key: "streak", label: "연속 출석" },
    { key: "reading", label: "읽기" },
  ];

  return (
    <section>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-55">
            / {title}
          </div>
          <div className="mt-2 text-sm leading-6 opacity-70">
            획득한 업적을 우선 배치하고, 나머지는 잠긴 상태로 정리해 보여줍니다.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 min-w-[220px]">
          <StatCard label="획득" value={stats.owned} />
          <StatCard label="전체" value={stats.total} />
          <StatCard label="달성률" value={`${stats.percent}%`} />
        </div>
      </div>

      <div className="mt-5 h-2 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#004aad] transition-all duration-500"
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setFilter(item.key);
                setShowAll(false);
              }}
              className={`shrink-0 px-4 py-2.5 rounded-full text-[11px] font-black tracking-[0.22em] uppercase italic border transition ${
                active
                  ? "bg-[#004aad] text-white border-[#004aad]"
                  : "border-black/10 text-zinc-700 hover:bg-black/5 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-white/[0.05]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
        {visibleAchievements.map((achievement) => {
          const owned = ownedMap.get(achievement.id);
          const unlocked = Boolean(owned);

          return (
            <article
              key={achievement.id}
              className={`rounded-[24px] border p-4 sm:p-5 transition ${rarityTone(
                achievement.rarity,
                unlocked
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-[16px] flex items-center justify-center text-2xl bg-white/70 dark:bg-black/20 shrink-0">
                    {unlocked ? achievement.icon : "🔒"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black tracking-[0.22em] uppercase opacity-60">
                        {getCategoryLabel(achievement.category)}
                      </span>
                      <span className="text-[10px] font-black tracking-[0.22em] uppercase opacity-45">
                        {getRarityLabel(achievement.rarity)}
                      </span>
                    </div>

                    <div className="mt-1 text-[18px] leading-[1.05] font-black italic tracking-[-0.03em]">
                      {achievement.title}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-black tracking-[0.18em] uppercase opacity-55">
                    XP
                  </div>
                  <div className="mt-1 text-sm font-black">
                    +{xpOf(achievement)}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm leading-6 opacity-75">
                {achievement.desc}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <span
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-[0.18em] uppercase ${
                    unlocked
                      ? "bg-[#004aad] text-white"
                      : "bg-black/6 text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400"
                  }`}
                >
                  {unlocked ? "Unlocked" : "Locked"}
                </span>

                <span className="text-[11px] opacity-55">
                  {unlocked && toDateText(owned?.earnedAt)
                    ? toDateText(owned?.earnedAt)
                    : unlocked
                    ? "획득 완료"
                    : "아직 미획득"}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {filteredCount > 8 && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-5 py-3 rounded-full text-[11px] font-black tracking-[0.24em] uppercase italic border border-black/10 text-zinc-700 hover:bg-black/5 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-white/[0.05]"
          >
            {showAll ? "Show Less" : `Show More · ${filteredCount - 8}`}
          </button>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[18px] border border-black/10 dark:border-zinc-800 bg-black/[0.02] dark:bg-white/[0.03] px-3 py-3 text-center">
      <div className="text-[10px] tracking-[0.2em] uppercase font-black opacity-45">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}