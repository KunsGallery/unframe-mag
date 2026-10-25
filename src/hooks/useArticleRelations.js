// src/hooks/useArticleRelations.js
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { loadArticlesByEdition, loadParentArticles } from "../lib/articleIndex";
import { normalizeRelatedEditionNos } from "../lib/relatedArticles";

const EMPTY = { key: "", parent: null, items: [] };

// A main article shows its related articles; a related article links back to
// its main article and shows the other articles that share it.
export function useArticleRelations(article) {
  const editionNo = String(article?.editionNo || "");
  const related = normalizeRelatedEditionNos(article?.relatedEditionNos, editionNo);
  const relatedKey = related.join("|");
  const key = `${editionNo}:${relatedKey}`;
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!editionNo) return;
    let alive = true;
    const own = relatedKey ? relatedKey.split("|") : [];
    (async () => {
      if (own.length) {
        const items = await loadArticlesByEdition(db, own);
        if (alive) setState({ key, parent: null, items });
        return;
      }
      const [parent] = await loadParentArticles(db, editionNo);
      if (!parent) {
        if (alive) setState({ key, parent: null, items: [] });
        return;
      }
      const siblings = normalizeRelatedEditionNos(parent.relatedEditionNos, editionNo);
      const items = await loadArticlesByEdition(db, siblings);
      if (alive) setState({ key, parent, items });
    })().catch((error) => {
      console.warn("[RelatedArticles] lookup failed:", error?.message || error);
      if (alive) setState({ key, parent: null, items: [] });
    });
    return () => {
      alive = false;
    };
  }, [editionNo, relatedKey, key]);

  return state.key === key ? state : EMPTY;
}
