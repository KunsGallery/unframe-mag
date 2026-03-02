import React from "react";
import { STICKERS } from "../../data/stickers";

function rarityClassName(rarity) {
  switch (rarity) {
    case "legendary":
      return "border-amber-300/40 bg-amber-100/5";
    case "epic":
      return "border-violet-400/40 bg-violet-100/5";
    case "rare":
      return "border-blue-400/40 bg-blue-100/5";
    default:
      return "border-zinc-200 dark:border-zinc-800 bg-transparent";
  }
}

export default function StickerGrid({ ownedIds = [], isDarkMode, showHidden = false }) {
  const ownedSet = new Set(Array.isArray(ownedIds) ? ownedIds : []);
  const visibleStickers = STICKERS.filter((sticker) => (showHidden ? true : !sticker.hidden));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {visibleStickers.map((sticker) => {
        const owned = ownedSet.has(sticker.id);

        return (
          <div
            key={sticker.id}
            className={[
              "rounded-2xl border p-4 transition",
              rarityClassName(sticker.rarity),
              owned ? "opacity-100" : "opacity-45",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-2xl">{owned ? sticker.icon : "🔒"}</div>
              <div
                className={[
                  "text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-[0.2em]",
                  isDarkMode
                    ? "bg-white/5 text-zinc-300"
                    : "bg-black/5 text-zinc-600",
                ].join(" ")}
              >
                {owned ? "owned" : "locked"}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-black">{sticker.name}</div>
              <div className="mt-1 text-xs opacity-65">{sticker.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}