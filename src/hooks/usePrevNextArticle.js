import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

/**
 * currentArticle 기준으로 이전/다음 published 글을 찾는다.
 * 기본: sortIndex 기준
 */
export function usePrevNextArticle({ db, currentArticle, sameCategory = false }) {
  const [prev, setPrev] = useState(null);
  const [next, setNext] = useState(null);
  const [loadingNav, setLoadingNav] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!currentArticle?.sortIndex) {
        setPrev(null);
        setNext(null);
        return;
      }

      setLoadingNav(true);
      try {
        const base = [
          where("status", "==", "published"),
          orderBy("sortIndex", "asc"),
        ];

        const categoryFilter =
          sameCategory && currentArticle?.category
            ? [where("category", "==", currentArticle.category)]
            : [];

        // ✅ prev: sortIndex < cur, orderBy desc, limit 1
        const prevQ = query(
          collection(db, "articles"),
          where("status", "==", "published"),
          ...categoryFilter,
          where("sortIndex", "<", currentArticle.sortIndex),
          orderBy("sortIndex", "desc"),
          limit(1)
        );

        // ✅ next: sortIndex > cur, orderBy asc, limit 1
        const nextQ = query(
          collection(db, "articles"),
          where("status", "==", "published"),
          ...categoryFilter,
          where("sortIndex", ">", currentArticle.sortIndex),
          orderBy("sortIndex", "asc"),
          limit(1)
        );

        const [prevSnap, nextSnap] = await Promise.all([getDocs(prevQ), getDocs(nextQ)]);

        setPrev(prevSnap.empty ? null : { id: prevSnap.docs[0].id, ...prevSnap.docs[0].data() });
        setNext(nextSnap.empty ? null : { id: nextSnap.docs[0].id, ...nextSnap.docs[0].data() });
      } catch (e) {
        console.error("[usePrevNextArticle] error:", e);
        setPrev(null);
        setNext(null);
      } finally {
        setLoadingNav(false);
      }
    };

    run();
  }, [db, currentArticle?.sortIndex, currentArticle?.category, sameCategory]);

  return { prev, next, loadingNav };
}