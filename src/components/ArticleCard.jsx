import React from "react";

function formatDate(value) {
  if (!value) return "";
  // Firestore Timestamp or Date
  const d =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
      ? value
      : null;
  if (!d) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function ArticleCard({ a, onClick }) {
  const cover = a.coverThumb || a.cover || "";
  return (
    <article
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden border border-black/10 bg-white hover:-translate-y-1 transition-all shadow-sm"
    >
      <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={a.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No Cover
          </div>
        )}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 text-white text-[11px] tracking-widest">
          {a.category || "—"}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3 text-[12px] text-gray-500 mb-2">
          <span className="font-mono">No.{a.id}</span>
          {a.createdAt ? <span>{formatDate(a.createdAt)}</span> : null}
        </div>

        <h3 className="font-serif font-bold text-xl leading-snug line-clamp-2">
          {a.title || "(Untitled)"}
        </h3>

        {a.excerpt ? (
          <p className="text-gray-600 text-sm mt-2 line-clamp-2">{a.excerpt}</p>
        ) : null}

        <div className="flex items-center gap-4 text-[12px] text-gray-500 mt-4">
          <span>👁 {a.views || 0}</span>
          <span>♥ {a.likes || 0}</span>
          {Array.isArray(a.tags) && a.tags.length > 0 ? (
            <span className="truncate">#{a.tags.slice(0, 3).join(" #")}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
