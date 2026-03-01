import React from "react";
import { Bookmark, Heart, Share2, ArrowUp } from "lucide-react";

export default function SideUtils({
  progress,
  onVerticalClick,
  saved,
  setSaved,
  isLiked,
  setIsLiked,
}) {
  return (
    <aside className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col items-center gap-4">
      <button
        onClick={() => setSaved(!saved)}
        className={`w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center transition-all ${
          saved
            ? "bg-[#004aad] text-white shadow-blue-500/50"
            : "bg-white/40 text-zinc-400 hover:text-black"
        }`}
      >
        <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
      </button>

      <button
        onClick={() => setIsLiked(!isLiked)}
        className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all"
      >
        <Heart size={20} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-500" : ""} />
      </button>

      <button className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center text-zinc-400 hover:text-black transition-all">
        <Share2 size={20} />
      </button>

      <div className="relative w-1.5 h-32 bg-zinc-200 dark:bg-zinc-800 rounded-full my-4 cursor-pointer group" onClick={onVerticalClick}>
        <div className="absolute top-0 left-0 w-full bg-[#004aad] rounded-full transition-all duration-150" style={{ height: `${progress * 100}%` }} />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#004aad] rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white pointer-events-none"
          style={{ top: `calc(${progress * 100}% - 8px)` }}
        />
      </div>

      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-zinc-300 hover:text-[#004aad] transition-all">
        <ArrowUp size={20} />
      </button>
    </aside>
  );
}