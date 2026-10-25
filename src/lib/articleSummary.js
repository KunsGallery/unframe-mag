// src/lib/articleSummary.js
import { estimateReadMinutes } from "./readingMeta.js";
import { normalizeRelatedEditionNos } from "./relatedArticles.js";
import { normalizeTags } from "./articleTags.js";

// Home cards read these small documents instead of every article body.
// Keep the field list in sync with the articleSummaries rule in firestore.rules.
const TEXT_FIELDS = ["title", "subtitle", "excerpt", "category", "author", "cover", "coverMedium", "coverThumb"];

export function buildArticleSummary(article, updatedAt) {
  const summary = {
    editionNo: article.editionNo,
    sortIndex: article.sortIndex,
    readMinutes: estimateReadMinutes(article, { min: 2 }),
    updatedAt,
  };
  for (const field of TEXT_FIELDS) {
    if (typeof article[field] === "string" && article[field]) summary[field] = article[field];
  }
  if (typeof summary.title !== "string") summary.title = article.title ?? "";
  const related = normalizeRelatedEditionNos(article.relatedEditionNos, article.editionNo);
  if (related.length) summary.relatedEditionNos = related;
  const tags = normalizeTags(article.tags);
  if (tags.length) summary.tags = tags;
  return summary;
}
