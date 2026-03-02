import React from "react";
import { Bookmark, Heart, Share2, ArrowUp } from "lucide-react";

export default function SideUtils({
  progress = 0,
  onVerticalClick,

  // 상태 표시(선택)
  saved = false,
  liked = false,

  // 액션 콜백(중요)
  onToggleSave,
  onToggleLike,
  onShare,
}) {
  const p = Math.max(0, Math.min(1, progress));

  return (
    <aside className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => onToggleSave?.()}
        className={`w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center transition-all ${
          saved
            ? "bg-[#004aad] text-white shadow-blue-500/50"
            : "bg-white/40 text-zinc-400 hover:text-black"
        } ${onToggleSave ? "" : "opacity-50 cursor-not-allowed"}`}
        title="Save"
      >
        <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
      </button>

      <button
        type="button"
        onClick={() => onToggleLike?.()}
        className={`w-12 h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center transition-all ${
          liked ? "text-red-500" : "text-zinc-400 hover:text-red-500"
        } ${onToggleLike ? "" : "opacity-50 cursor-not-allowed"}`}
        title="Like"
      >
        <Heart size={20} fill={liked ? "currentColor" : "none"} />
      </button>

      <button
        type="button"
        className={`w-12 h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center text-zinc-400 hover:text-black transition-all ${
          onShare ? "" : "opacity-50 cursor-not-allowed"
        }`}
        title="Share"
        onClick={() => onShare?.()}
      >
        <Share2 size={20} />
      </button>

      <div
        className="relative w-1.5 h-32 bg-zinc-200 dark:bg-zinc-800 rounded-full my-4 cursor-pointer group"
        onClick={onVerticalClick}
        role="button"
        tabIndex={0}
      >
        <div
          className="absolute top-0 left-0 w-full bg-[#004aad] rounded-full transition-all duration-150"
          style={{ height: `${p * 100}%` }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#004aad] rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white pointer-events-none"
          style={{ top: `calc(${p * 100}% - 8px)` }}
        />
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="text-zinc-300 hover:text-[#004aad] transition-all"
        title="Back to top"
      >
        <ArrowUp size={20} />
      </button>
    </aside>
  );
}