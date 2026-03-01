import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

export function useArticleByEditionNo({ db, editionNo, editor }) {
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!editor) return;

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
        if (snap.empty) {
          setArticle(null);
          editor.commands.setContent("");
          return;
        }

        const data = snap.docs[0].data();
        setArticle(data);

        editor.commands.setContent(data?.contentHTML || "");
      } catch (e) {
        console.error("Fetch Error:", e);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [db, editionNo, editor]);

  return { loading, article };
}