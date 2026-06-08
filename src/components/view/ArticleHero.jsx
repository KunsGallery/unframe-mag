import React from "react";
import { getCoverImageUrl } from "../../lib/imageUrl";

export default function ArticleHero({
  article,
  authorName,
  readMinutes = 1,
  readEmoji = "☕️",
  onOpenImage,
}) {
  const heroSrc = getCoverImageUrl(article, {
    width: 2400,
    quality: "auto:good",
  }) || null;
  const originalHeroSrc = (article.cover || heroSrc || "").trim() || null;
  const subtitle = article.subtitle?.trim?.() || "";
  const heroCaption = article.title || article.subtitle || "";

  return (
    <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 scale-105">
        {heroSrc ? (
          <img
            src={heroSrc}
            data-original-src={originalHeroSrc || undefined}
            data-caption={heroCaption || undefined}
            className="w-full h-full object-cover opacity-40 dark:opacity-20 blur-[2px] cursor-zoom-in"
            alt={article.title || ""}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onClick={(event) => {
              event.stopPropagation();
              onOpenImage?.({
                src: originalHeroSrc || event.currentTarget.currentSrc || event.currentTarget.src,
                alt: article.title || "",
                caption: heroCaption || null,
              });
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-[#fcfcfc]/50 to-[#fcfcfc] dark:via-zinc-950/50 dark:to-zinc-950" />
      </div>

      <div className="relative z-10 text-center max-w-4xl px-6">
        <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#004aad] mb-8 inline-block bg-[#004aad]/10 px-4 py-1 rounded">
          {article.category}
        </span>

        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none dark:text-white break-keep drop-shadow-sm whitespace-pre-line">
          {article.title}
        </h1>

        {subtitle ? (
          <p className="mt-6 max-w-3xl mx-auto text-sm sm:text-lg md:text-xl font-light italic leading-relaxed text-zinc-500 dark:text-zinc-300">
            {subtitle}
          </p>
        ) : null}

        <div className="mt-12 flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold tracking-widest text-zinc-400 uppercase italic flex-wrap">
          <span>By {authorName || article.author || "Kim Jae Woo"}</span>
          <div className="w-1 h-1 bg-zinc-300 rounded-full" />
          <span>Archive No.{article.editionNo}</span>
          <div className="w-1 h-1 bg-zinc-300 rounded-full" />
          <span>
            {readEmoji} 예상 {readMinutes}분
          </span>
        </div>
      </div>
    </section>
  );
}
