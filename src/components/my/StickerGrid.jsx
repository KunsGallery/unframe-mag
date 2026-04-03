import React, { useMemo } from "react";
import { STICKERS } from "../../data/stickers";

function rarityLabel(rarity) {
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

function rarityTone(rarity, owned) {
  if (!owned) {
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

export default function StickerGrid({
  ownedIds = [],
  isDarkMode,
  showHidden = false,
}) {
  const ownedSet = useMemo(
    () => new Set(Array.isArray(ownedIds) ? ownedIds : []),
    [ownedIds]
  );

  const visibleStickers = useMemo(
    () => STICKERS.filter((sticker) => (showHidden ? true : !sticker.hidden)),
    [showHidden]
  );

  const ownedCount = useMemo(
    () => visibleStickers.filter((s) => ownedSet.has(s.id)).length,
    [visibleStickers, ownedSet]
  );

  const percent =
    visibleStickers.length > 0
      ? Math.round((ownedCount / visibleStickers.length) * 100)
      : 0;

  return (
    <section>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-55">
            / Sticker Collection
          </div>
          <div className="mt-2 text-sm leading-6 opacity-70">
            활동을 통해 모은 스티커를 한눈에 정리한 개인 컬렉션입니다.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 min-w-[220px]">
          <StatCard label="획득" value={ownedCount} />
          <StatCard label="전체" value={visibleStickers.length} />
          <StatCard label="달성률" value={`${percent}%`} />
        </div>
      </div>

      <div className="mt-5 h-2 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#004aad] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
        {visibleStickers.map((sticker) => {
          const owned = ownedSet.has(sticker.id);

          return (
            <article
              key={sticker.id}
              className={`rounded-[24px] border p-4 sm:p-5 transition ${rarityTone(
                sticker.rarity,
                owned
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-[16px] flex items-center justify-center text-2xl bg-white/70 dark:bg-black/20 shrink-0">
                    {owned ? sticker.icon : "🔒"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black tracking-[0.22em] uppercase opacity-60">
                        Sticker
                      </span>
                      <span className="text-[10px] font-black tracking-[0.22em] uppercase opacity-45">
                        {rarityLabel(sticker.rarity)}
                      </span>
                    </div>

                    <div className="mt-1 text-[18px] leading-[1.05] font-black italic tracking-[-0.03em]">
                      {sticker.name}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-[0.18em] uppercase ${
                    owned
                      ? "bg-[#004aad] text-white"
                      : "bg-black/6 text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400"
                  }`}
                >
                  {owned ? "Owned" : "Locked"}
                </span>
              </div>

              <div className="mt-3 text-sm leading-6 opacity-75">
                {sticker.desc}
              </div>
            </article>
          );
        })}
      </div>
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