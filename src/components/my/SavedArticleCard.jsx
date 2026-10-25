import { Link } from "react-router-dom";
import { getCoverImageUrl } from "../../lib/imageUrl";
import { padEdition } from "../../lib/myPageFormat";

function coverUrlOfSaved(doc) {
  return getCoverImageUrl(doc, { width: 800 });
}

export default function SavedArticleCard({ article, editionNo, onRemove, isDarkMode }) {
  const img = coverUrlOfSaved(article);

  return (
    <div
      className={`group rounded-[26px] overflow-hidden border ${
        isDarkMode
          ? "border-zinc-800 bg-zinc-950"
          : "border-black/10 bg-[#fcfbf8]"
      }`}
    >
      <Link to={`/article/${editionNo}`} className="block">
        <div className="aspect-[1.2/1] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          {img ? (
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.035]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
              No Cover
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 text-[10px] font-black italic tracking-[0.38em] uppercase opacity-55">
            <span>#{padEdition(editionNo)}</span>
            <span className="text-[#004aad]">{article.category || "—"}</span>
          </div>

          <div className="mt-3 text-xl sm:text-[22px] leading-[1.02] font-black italic tracking-[-0.04em] line-clamp-3">
            {article.title || "Untitled"}
          </div>

          {article.subtitle ? (
            <div className="mt-3 text-sm leading-6 opacity-65 line-clamp-2">
              {article.subtitle}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex justify-end">
        <button
          onClick={() => onRemove(editionNo)}
          className={`text-[10px] font-black tracking-[0.35em] uppercase italic px-4 py-2.5 rounded-full border transition ${
            isDarkMode
              ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              : "border-black/10 text-zinc-700 hover:bg-black/5"
          }`}
          type="button"
        >
          UNSAVE
        </button>
      </div>
    </div>
  );
}
