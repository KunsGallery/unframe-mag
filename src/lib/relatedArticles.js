// src/lib/relatedArticles.js
// A main article (e.g. a group exhibition preface) lists related articles
// (e.g. one curator's note per artist) by edition number, in reading order.
export const MAX_RELATED_ARTICLES = 12;

export function normalizeRelatedEditionNos(value, selfEditionNo = "") {
  if (!Array.isArray(value)) return [];
  const self = String(selfEditionNo || "");
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const editionNo = String(item ?? "").trim();
    if (!editionNo || editionNo === self || seen.has(editionNo)) continue;
    seen.add(editionNo);
    result.push(editionNo);
    if (result.length === MAX_RELATED_ARTICLES) break;
  }
  return result;
}

export function sameRelatedList(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// Keep the editor's chosen order and drop editions that are no longer published.
export function orderRelatedArticles(editionNos, articles) {
  const byEdition = new Map(articles.map((article) => [String(article.editionNo), article]));
  return editionNos.map((editionNo) => byEdition.get(editionNo)).filter(Boolean);
}
