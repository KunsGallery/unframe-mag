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

function rarityClassName(rarity) {
  switch (rarity) {
    case "legendary":
      return "is-legendary";
    case "epic":
      return "is-epic";
    case "rare":
      return "is-rare";
    default:
      return "is-common";
  }
}

export default function AchievementGrid({
  ownedAchievements = [],
  showHidden = false,
  title = "Achievements",
}) {
  const [filter, setFilter] = useState("all");

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
    if (filter === "all") return allAchievements;
    return allAchievements.filter((a) => a.category === filter);
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
    <section className="achievement-section">
      <div className="achievement-section__head">
        <div>
          <h2 className="achievement-section__title">{title}</h2>
          <p className="achievement-section__sub">
            획득한 업적과 아직 잠겨 있는 업적을 한눈에 볼 수 있어요.
          </p>
        </div>

        <div className="achievement-summary">
          <div className="achievement-summary__stat">
            <span className="achievement-summary__label">획득</span>
            <strong>{stats.owned}</strong>
          </div>
          <div className="achievement-summary__stat">
            <span className="achievement-summary__label">전체</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="achievement-summary__stat">
            <span className="achievement-summary__label">달성률</span>
            <strong>{stats.percent}%</strong>
          </div>
        </div>
      </div>

      <div className="achievement-progress">
        <div
          className="achievement-progress__bar"
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      <div className="achievement-filters">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`achievement-filter ${
              filter === item.key ? "is-active" : ""
            }`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="achievement-grid">
        {visibleAchievements.map((achievement) => {
          const owned = ownedMap.get(achievement.id);
          const unlocked = Boolean(owned);

          return (
            <article
              key={achievement.id}
              className={`achievement-card ${rarityClassName(
                achievement.rarity
              )} ${unlocked ? "is-unlocked" : "is-locked"}`}
            >
              <div className="achievement-card__top">
                <div className="achievement-card__icon">
                  {unlocked ? achievement.icon : "🔒"}
                </div>

                <div className="achievement-card__meta">
                  <span className="achievement-card__category">
                    {getCategoryLabel(achievement.category)}
                  </span>
                  <span className="achievement-card__rarity">
                    {getRarityLabel(achievement.rarity)}
                  </span>
                </div>
              </div>

              <div className="achievement-card__body">
                <h3 className="achievement-card__title">{achievement.title}</h3>
                <p className="achievement-card__desc">{achievement.desc}</p>
              </div>

              <div className="achievement-card__bottom">
                <div className="achievement-card__reward">
                  <span>XP</span>
                  <strong>+{achievement.xpReward || achievement.xpBonus || 0}</strong>
                </div>

                <div className="achievement-card__status">
                  {unlocked ? (
                    <>
                      <span className="achievement-card__badge is-earned">
                        획득 완료
                      </span>
                      {toDateText(owned?.earnedAt) ? (
                        <span className="achievement-card__date">
                          {toDateText(owned?.earnedAt)}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="achievement-card__badge is-locked">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}