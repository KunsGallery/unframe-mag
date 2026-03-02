import React from "react";
import { usePrevNextArticle } from "../../hooks/usePrevNextArticle";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { estimateReadMinutes, timeEmoji } from "../../lib/readingMeta";

function Card({ label, article, disabled }) {
  const nav = useNavigate();

  const cover =
    article?.coverMedium ||
    article?.coverThumb ||
    article?.cover ||
    "";

  const readMinutes = estimateReadMinutes(article);
  const readEmoji = timeEmoji(readMinutes);

  const go = () => {
    if (!article?.editionNo) return;
    nav(`/article/${article.editionNo}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={go}
      disabled={disabled}
      className={[
        "group relative w-full text-left rounded-[24px] overflow-hidden transition",
        "border border-zinc-200 dark:border-zinc-800",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:border-[#004aad] hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]",
        "min-h-[220px]",
      ].join(" ")}
      title={disabled ? `${label} 글이 없어요` : `${label}: ${article?.title || ""}`}
    >
      <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900">
        {cover ? (
          <>
            <img
              src={cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-[14px] opacity-90 transition-transform duration-700 group-hover:scale-[1.14]"
              loading="lazy"
            />
            <img
              src={cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
            No Cover
          </div>
        )}

        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-black/10" />
      </div>

      <div className="relative z-10 h-full p-6 sm:p-7 flex flex-col justify-end">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black tracking-[0.35em] uppercase text-white/70 italic">
            {label}
          </span>

          {article?.editionNo && (
            <span className="text-[11px] font-black text-[#7fb1ff]">
              #{String(article.editionNo).padStart(3, "0")}
            </span>
          )}
        </div>

        <div className="mt-3 text-2xl sm:text-[28px] font-black italic tracking-tight leading-[1.02] text-white line-clamp-2">
          {article?.title || (disabled ? "없음" : "Untitled")}
        </div>

        {article?.subtitle ? (
          <div className="mt-3 text-sm sm:text-[15px] text-white/75 line-clamp-2">
            {article.subtitle}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60">
            {article?.category || "ARTICLE"} · {readEmoji} 예상 {readMinutes}분
          </div>

          {!disabled && (
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9fc3ff]">
              OPEN →
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function PrevNextCards({ currentArticle, sameCategory = false }) {
  const { prev, next, loadingNav } = usePrevNextArticle({
    db,
    currentArticle,
    sameCategory,
  });

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black tracking-tight text-zinc-500 dark:text-zinc-400">
          More Articles
        </h4>
        {loadingNav && (
          <span className="text-xs text-zinc-400">loading…</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card label="Previous" article={prev} disabled={!prev} />
        <Card label="Next" article={next} disabled={!next} />
      </div>
    </section>
  );
}