import React from "react";
import { usePrevNextArticle } from "../../hooks/usePrevNextArticle";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";

function Card({ label, article, disabled }) {
  const nav = useNavigate();

  const cover =
    article?.coverMedium ||
    article?.coverThumb ||
    article?.cover ||
    "";

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
        "group w-full text-left rounded-2xl border overflow-hidden transition",
        "border-zinc-200 dark:border-zinc-800",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:border-[#004aad] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
        "bg-white dark:bg-zinc-950",
      ].join(" ")}
      title={disabled ? `${label} 글이 없어요` : `${label}: ${article?.title || ""}`}
    >
      <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr]">
        <div className="relative h-[110px] sm:h-[130px] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
              No Cover
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black tracking-widest text-zinc-400 uppercase">
              {label}
            </span>
            {article?.editionNo && (
              <span className="text-[11px] font-black text-[#004aad]">
                #{String(article.editionNo).padStart(3, "0")}
              </span>
            )}
          </div>

          <div className="mt-2 font-black leading-snug line-clamp-2">
            {article?.title || (disabled ? "없음" : "Untitled")}
          </div>

          {article?.subtitle && (
            <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {article.subtitle}
            </div>
          )}

          {article?.category && (
            <div className="mt-3 text-xs text-zinc-400">
              {article.category}
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