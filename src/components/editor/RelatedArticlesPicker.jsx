import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { loadPublishedArticleCards } from "../../lib/articleIndex";
import { filterHomeArchive } from "../../lib/homeEditorial";
import { MAX_RELATED_ARTICLES } from "../../lib/relatedArticles";

const label = (article) => `#${article.editionNo} ${article.title || "제목 없음"}`;

export default function RelatedArticlesPicker({ db, value, onChange, selfEditionNo, disabled }) {
  const [articles, setArticles] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    loadPublishedArticleCards(db, { max: 200 })
      .then((items) => alive && setArticles(items))
      .catch(() => alive && setArticles([]));
    return () => {
      alive = false;
    };
  }, [db]);

  const byEdition = useMemo(
    () => new Map((articles || []).map((article) => [String(article.editionNo), article])),
    [articles],
  );
  const candidates = useMemo(() => {
    const taken = new Set([...value, String(selfEditionNo || "")]);
    return filterHomeArchive(articles || [], "All", search)
      .filter((article) => !taken.has(String(article.editionNo)))
      .slice(0, 8);
  }, [articles, search, value, selfEditionNo]);

  const move = (index, offset) => {
    const next = [...value];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };
  const full = value.length >= MAX_RELATED_ARTICLES;

  return (
    <div className="uf-related-picker">
      <h3>연관 글</h3>
      <p>
        전시 서문에 작가별 글을 연결하면 이 글 하단에 카드로 보이고, 연결된 글에는
        이 글로 돌아가는 링크가 생깁니다. 발행된 글만 연결할 수 있어요.
      </p>
      {value.length > 0 && (
        <ol aria-label="연결된 글 순서">
          {value.map((editionNo, index) => {
            const article = byEdition.get(editionNo);
            return (
              <li key={editionNo}>
                <span>{article ? label(article) : `#${editionNo} (발행 글 목록에 없음)`}</span>
                <button type="button" aria-label="위로" disabled={disabled || index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" aria-label="아래로" disabled={disabled || index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                <button type="button" aria-label="연결 해제" disabled={disabled} onClick={() => onChange(value.filter((item) => item !== editionNo))}><X size={14} /></button>
              </li>
            );
          })}
        </ol>
      )}
      <label>
        <span className="sr-only">연결할 글 검색</span>
        <input
          type="search"
          value={search}
          disabled={disabled || full}
          placeholder={full ? `최대 ${MAX_RELATED_ARTICLES}개까지 연결할 수 있어요` : "제목, 작가, 번호(#6)로 찾기"}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {articles === null ? (
        <p role="status">발행된 글을 불러오는 중…</p>
      ) : (
        !full && (
          <ul aria-label="연결할 수 있는 글">
            {candidates.map((article) => (
              <li key={article.editionNo}>
                <button type="button" disabled={disabled} onClick={() => onChange([...value, String(article.editionNo)])}>
                  <Plus size={14} />
                  <span>{label(article)}</span>
                  <small>{article.category}</small>
                </button>
              </li>
            ))}
            {!candidates.length && <li className="uf-related-empty">연결할 수 있는 글이 없어요.</li>}
          </ul>
        )
      )}
    </div>
  );
}
