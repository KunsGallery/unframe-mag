import { Link } from "react-router-dom";
import { getCoverImageUrl } from "../../lib/imageUrl";

const articlePath = (article) => `/article/${encodeURIComponent(article.editionNo)}`;
const editionLabel = (article) => `#${String(article.editionNo).padStart(3, "0")}`;

export function ParentArticleLink({ parent }) {
  if (!parent) return null;
  return (
    <Link
      to={articlePath(parent)}
      className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:border-[#004aad] transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-black uppercase tracking-[0.25em] text-[#004aad] dark:text-[#7fb1ff]">
          이 글이 포함된 글 · {editionLabel(parent)}
        </span>
        <span className="mt-1 block text-sm sm:text-base font-bold line-clamp-1">
          {parent.title || "Untitled"}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.25em] text-zinc-500">
        메인 글 →
      </span>
    </Link>
  );
}

function RelatedCard({ article }) {
  const cover = getCoverImageUrl(article, { width: 640 });
  return (
    <Link
      to={articlePath(article)}
      className="group block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-[#004aad] transition-colors"
    >
      {cover && (
        <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          <img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
          {article.category || "ARTICLE"} · {editionLabel(article)}
        </div>
        <div className="mt-2 text-lg font-black leading-snug line-clamp-2">{article.title || "Untitled"}</div>
        {article.subtitle && <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{article.subtitle}</div>}
      </div>
    </Link>
  );
}

export default function RelatedArticles({ parent, items }) {
  if (!items.length && !parent) return null;
  const cards = parent ? [parent, ...items] : items;
  return (
    <section className="mt-14" aria-labelledby="uf-related-heading">
      <h4 id="uf-related-heading" className="text-sm font-black tracking-tight text-zinc-500 dark:text-zinc-400">
        {parent ? "함께 읽는 글" : `함께 읽는 글 · ${items.length}`}
      </h4>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((article) => (
          <RelatedCard key={article.editionNo} article={article} />
        ))}
      </div>
    </section>
  );
}
