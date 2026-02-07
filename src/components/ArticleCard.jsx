import React from "react";

// 날짜 포맷팅 함수 (기존 유지)
function formatDate(value) {
  if (!value) return "";
  const d = typeof value?.toDate === "function" ? value.toDate() : value instanceof Date ? value : null;
  if (!d) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function ArticleCard({ a, onClick }) {
  const cover = a.coverThumb || a.cover || "";

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer flex flex-col transition-all duration-500 border-b border-black/5 pb-8 mb-8 last:border-0"
    >
      {/* 1. 이미지 영역: 둥근 모서리를 줄이고 엣지를 살림 */}
      <div className="relative aspect-[16/9] overflow-hidden bg-black/5 mb-6">
        {cover ? (
          <img
            src={cover}
            alt={a.title}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs tracking-widest">NO IMAGE</div>
        )}
        
        {/* 카테고리 태그: 더 미니멀하게 */}
        <div className="absolute top-0 left-0 bg-black text-white px-3 py-1.5 text-[10px] uppercase tracking-[0.2em]">
          {a.category || "UNFRAME"}
        </div>
      </div>

      {/* 2. 텍스트 영역: 타이포그래피 강조 */}
      <div className="flex flex-col">
        <div className="flex justify-between items-baseline mb-3">
          <span className="font-mono text-[11px] opacity-40 uppercase tracking-tighter">Issue No.{a.id}</span>
          <span className="text-[11px] opacity-50">{formatDate(a.createdAt)}</span>
        </div>

        <h3 className="font-serif font-bold text-2xl md:text-3xl leading-[1.2] mb-3 group-hover:underline decoration-1 underline-offset-4">
          {a.title || "(Untitled)"}
        </h3>

        {a.excerpt && (
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed line-clamp-2 mb-4 font-light">
            {a.excerpt}
          </p>
        )}

        {/* 3. 하단 메타 데이터: 정갈한 선으로 구분 */}
        <div className="flex items-center justify-between pt-4 border-t border-black/5 mt-auto">
          <div className="flex gap-4 text-[10px] uppercase tracking-widest opacity-60 font-medium">
            <span>Views {a.views || 0}</span>
            <span>Likes {a.likes || 0}</span>
          </div>
          
          {Array.isArray(a.tags) && a.tags.length > 0 && (
            <div className="flex gap-2">
              {a.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}