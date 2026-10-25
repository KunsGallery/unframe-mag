// src/lib/articleIndex.js
// Card-sized article lookups. articleSummaries hold everything a card needs
// without the body; until every published article has one, fall back to the
// full documents so nothing disappears.
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { orderRelatedArticles } from "./relatedArticles.js";

const withId = (snap) => snap.docs.map((entry) => ({ docId: entry.id, ...entry.data() }));
const publishedArticles = (db) => query(collection(db, "articles"), where("status", "==", "published"));

export async function loadPublishedArticleCards(db, { max = 60 } = {}) {
  const published = publishedArticles(db);
  const summaries = collection(db, "articleSummaries");
  const count = (source) =>
    getCountFromServer(source)
      .then((snap) => snap.data().count)
      .catch(() => -1);
  const [publishedCount, summaryCount] = await Promise.all([count(published), count(summaries)]);
  const source = summaryCount > 0 && summaryCount === publishedCount ? summaries : published;
  return withId(await getDocs(query(source, orderBy("sortIndex", "desc"), limit(max))));
}

// Related cards in the editor's chosen order; editions without a summary yet are read in full.
export async function loadArticlesByEdition(db, editionNos) {
  if (!editionNos.length) return [];
  const fromSummaries = await getDocs(
    query(collection(db, "articleSummaries"), where("editionNo", "in", editionNos)),
  ).then(withId).catch(() => []);
  const found = new Set(fromSummaries.map((article) => String(article.editionNo)));
  const missing = editionNos.filter((editionNo) => !found.has(editionNo));
  const fromArticles = missing.length
    ? withId(await getDocs(query(publishedArticles(db), where("editionNo", "in", missing))))
    : [];
  return orderRelatedArticles(editionNos, [...fromSummaries, ...fromArticles]);
}

// Main articles (e.g. an exhibition preface) that list this edition as related.
export async function loadParentArticles(db, editionNo) {
  if (!editionNo) return [];
  return withId(await getDocs(
    query(collection(db, "articleSummaries"), where("relatedEditionNos", "array-contains", String(editionNo)), limit(3)),
  ));
}
