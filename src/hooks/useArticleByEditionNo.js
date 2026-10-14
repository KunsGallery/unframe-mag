import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

export function useArticleByEditionNo({ db, editionNo, editor }) {
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!editor || editor.isDestroyed) return;

      setLoading(true);
      setArticle(null);

      try {
        const q = query(
          collection(db, "articles"),
          where("editionNo", "==", editionNo),
          where("status", "==", "published"),
          limit(1)
        );

        const snap = await getDocs(q);
        if (!active || editor.isDestroyed) return;
        if (snap.empty) {
          setArticle(null);
          editor.commands.setContent("");
          return;
        }

        const docSnap = snap.docs[0];
        const data = docSnap.data();

        setArticle({
          id: docSnap.id,
          ...data
        });

        editor.commands.setContent(data?.contentHTML || "");
      } catch (e) {
        console.error("Fetch Error:", e);
        if (active) setArticle(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [db, editionNo, editor]);

  return { loading, article };
}
