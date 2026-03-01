import React from "react";

export default function ArticleHero({ article }) {
  const heroSrc = (article.coverMedium || article.cover || "").trim() || null;

  return (
    <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 scale-105">
        {heroSrc ? (
          <img
            src={heroSrc}
            className="w-full h-full object-cover opacity-40 dark:opacity-20 blur-[2px]"
            alt=""
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#fcfcfc]/50 to-[#fcfcfc] dark:via-zinc-950/50 dark:to-zinc-950" />
      </div>

      <div className="relative z-10 text-center max-w-4xl px-6">
        <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#004aad] mb-8 inline-block bg-[#004aad]/10 px-4 py-1 rounded">
          {article.category}
        </span>
        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none dark:text-white break-keep drop-shadow-sm">
          {article.title}
        </h1>
        <div className="mt-12 flex items-center justify-center gap-8 text-xs font-bold tracking-widest text-zinc-400 uppercase italic">
          <span>By {article.author || "Kim Jae Woo"}</span>
          <div className="w-1 h-1 bg-zinc-300 rounded-full" />
          <span>Archive No.{article.editionNo}</span>
        </div>
      </div>
    </section>
  );
}