import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toMillis } from "../../lib/relativeTime";
import { ARCHIVE_CATEGORIES } from "../../constants/categories";

const formatDateTime = (millis) => new Intl.DateTimeFormat("ko-KR", {
  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
}).format(millis);
const formatCount = (value) => Number(value || 0).toLocaleString("ko-KR");
const categoryLabel = (key) => ARCHIVE_CATEGORIES.find((item) => item.key === key)?.label || key;

// Position among published articles of the same category, read from the card summaries.
function useCategoryPosition(category, sortIndex) {
  const [position, setPosition] = useState(null);
  useEffect(() => {
    if (!category || !Number.isFinite(Number(sortIndex))) return undefined;
    let alive = true;
    getDocs(query(collection(db, "articleSummaries"), where("category", "==", category)))
      .then((snap) => {
        const indexes = snap.docs.map((entry) => Number(entry.data().sortIndex)).filter(Number.isFinite);
        const rank = indexes.filter((value) => value <= Number(sortIndex)).length;
        if (alive && rank) setPosition({ key: `${category}:${sortIndex}`, rank, total: indexes.length });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [category, sortIndex]);
  return position?.key === `${category}:${sortIndex}` ? position : null;
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-zinc-100 dark:border-zinc-900 last:border-b-0">
      <dt className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">{label}</dt>
      <dd className="text-sm font-semibold text-right tabular-nums break-keep">{children}</dd>
    </div>
  );
}

// Right-hand column of the editor box: facts about this article.
export default function ArticleInfoPanel({ article, likeCount, saveCount }) {
  const position = useCategoryPosition(article?.category, article?.sortIndex);
  const created = toMillis(article?.createdAt);
  const updated = toMillis(article?.updatedAt);
  // Only mention an edit made at least a day after writing.
  const showUpdated = updated && created && updated - created > 24 * 60 * 60 * 1000;

  return (
    <div>
      <div className="text-[10px] tracking-[0.45em] uppercase font-black italic opacity-55">/ Article</div>
      <dl className="mt-4">
        {created ? <Row label="작성"><time dateTime={new Date(created).toISOString()}>{formatDateTime(created)}</time></Row> : null}
        {showUpdated ? <Row label="최종 수정"><time dateTime={new Date(updated).toISOString()}>{formatDateTime(updated)}</time></Row> : null}
        {article?.category ? (
          <Row label="카테고리">
            {categoryLabel(article.category)}
            {position ? <span className="ml-1.5 text-zinc-500 dark:text-zinc-400 font-medium">· {position.total}개 중 {position.rank}번째 글</span> : null}
          </Row>
        ) : null}
        <Row label="좋아요">{formatCount(likeCount ?? article?.likes)}</Row>
        <Row label="조회수">{formatCount(article?.views)}</Row>
        {typeof saveCount === "number" ? <Row label="저장">{formatCount(saveCount)}</Row> : null}
      </dl>
    </div>
  );
}
