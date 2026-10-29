import { normalizeSearchText, toChoseong } from "./koreanSearch.js";

export function buildHomeSelection(articles, config = {}) {
  const byId = new Map(
    articles.map((article) => [String(article.editionNo), article]),
  );
  const unique = (items) => [
    ...new Map(
      items
        .filter(Boolean)
        .map((article) => [String(article.editionNo), article]),
    ).values(),
  ];
  const recommended = unique([
    ...(config?.editorPicks || []).map((id) => byId.get(String(id))),
    ...articles,
  ]);
  const ordered = unique([
    byId.get(String(config?.heroEditionNo)),
    ...recommended,
  ]);
  const picks = recommended
    .filter((article) => article !== ordered[0])
    .slice(0, 2);
  return {
    covers: ordered.slice(0, 3),
    picks: picks.length ? picks : ordered.slice(0, 1),
    reading: recommended.slice(0, 4),
  };
}

function searchFields(article) {
  const text = normalizeSearchText(
    [
      article.title,
      article.subtitle,
      article.excerpt,
      article.author,
      article.category,
      ...(Array.isArray(article.tags) ? article.tags : []),
    ].join(" "),
  );
  const compact = text.replace(/\s+/g, "");
  return { compact, choseong: toChoseong(compact), edition: Number(article.editionNo) };
}

// Every word must match: as typed ignoring spaces, as Korean initial consonants
// ("ㅅㄹ"), or as an edition number ("6", "#006", "no.6").
function matchesTerm(fields, term) {
  const edition = term.match(/^(?:#|no\.?)?0*(\d+)$/);
  if (edition && Number(edition[1]) === fields.edition) return true;
  if (fields.compact.includes(term)) return true;
  return /^[ㄱ-ㅎ]+$/.test(term) && fields.choseong.includes(term);
}

export function filterHomeArchive(articles, category, search = "") {
  const terms = normalizeSearchText(search).split(/\s+/).filter(Boolean);
  return articles.filter((article) => {
    if (category !== "All" && article.category !== category) return false;
    if (!terms.length) return true;
    const fields = searchFields(article);
    return terms.every((term) => matchesTerm(fields, term));
  });
}

// Publication order is assigned once at publication and remains stable on edits.
export function sortHomeArchive(articles, sort = "latest", editorPicks = []) {
  const picks = new Map((editorPicks || []).map((id, index) => [String(id), index]));
  const latest = (a, b) => (Number(b.sortIndex) || 0) - (Number(a.sortIndex) || 0);
  return [...articles].sort((a, b) => {
    if (sort === "oldest") return -latest(a, b);
    if (sort === "likes" || sort === "views") {
      return ((Number(b[sort]) || 0) - (Number(a[sort]) || 0)) || latest(a, b);
    }
    if (sort === "recommended") {
      return (picks.get(String(a.editionNo)) ?? Infinity) - (picks.get(String(b.editionNo)) ?? Infinity) || latest(a, b);
    }
    return latest(a, b);
  });
}

export function positiveRankingItems(items, metric) {
  return items.filter(
    (article) =>
      Number.isFinite(Number(article[metric])) && Number(article[metric]) > 0,
  );
}
