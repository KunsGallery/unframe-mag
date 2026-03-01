import React from "react";

export default function ArticleNav({ article, nav }) {
  return (
    <nav className="max-w-[760px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mt-20">
      {article.prev && (
        <button
          onClick={() => nav(`/article/${article.prev.id}`)}
          className="group relative h-44 rounded-[32px] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:-translate-y-1"
        >
          <img src={article.prev.coverMedium || article.prev.cover} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000" alt="" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fcfcfc] dark:from-zinc-950 p-10 flex flex-col justify-center">
            <span className="text-[10px] font-black text-[#004aad] mb-2 uppercase tracking-widest italic">Previous</span>
            <h4 className="text-lg font-black italic leading-tight dark:text-white line-clamp-2">{article.prev.title}</h4>
          </div>
        </button>
      )}

      {article.next && (
        <button
          onClick={() => nav(`/article/${article.next.id}`)}
          className="group relative h-44 rounded-[32px] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:-translate-y-1"
        >
          <img src={article.next.coverMedium || article.next.cover} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000" alt="" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#fcfcfc] dark:from-zinc-950 p-10 flex flex-col justify-center text-right">
            <span className="text-[10px] font-black text-[#004aad] mb-2 uppercase tracking-widest italic">Next</span>
            <h4 className="text-lg font-black italic leading-tight dark:text-white line-clamp-2">{article.next.title}</h4>
          </div>
        </button>
      )}
    </nav>
  );
}