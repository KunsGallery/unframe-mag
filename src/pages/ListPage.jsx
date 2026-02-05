import React, { useEffect, useMemo, useState } from "react";
import { getPublishedArticles } from "../services/articles";
import { go } from "../utils/router";
import ArticleCard from "../components/ArticleCard";

export default function ListPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await getPublishedArticles();
        setAll(list);
      } catch (e) {
        console.error(e);
        alert("목록을 불러오지 못했어. (권한/인덱스/네트워크 확인)");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(all.map((a) => a.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [all]);

  const filtered = useMemo(() => {
    const t = tag.trim().replace(/^#/, "");
    return all.filter((a) => {
      const catOk = category === "All" ? true : a.category === category;
      const tagOk =
        !t
          ? true
          : Array.isArray(a.tags) &&
            a.tags.some((x) => String(x).toLowerCase().includes(t.toLowerCase()));
      return catOk && tagOk;
    });
  }, [all, category, tag]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black">
      <header className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="text-xs tracking-[0.35em] uppercase text-black/50">
              Independent Art Magazine
            </div>
            <h1 className="font-serif font-black text-5xl md:text-6xl tracking-tight mt-3">
              UNFRAME
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => go("?mode=editor")}
              className="px-5 py-3 rounded-full bg-black text-white font-bold text-sm hover:opacity-90"
            >
              Write
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-black/10 rounded-xl px-4 py-3 bg-white outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="태그 검색 (예: #unframe / 전시)"
            className="md:col-span-2 border border-black/10 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="text-gray-500">로딩중...</div>
        ) : (
          <>
            <div className="text-sm text-black/50 mb-5">
              {filtered.length} articles
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filtered.map((a) => (
                <ArticleCard
                  key={a.firebaseId}
                  a={a}
                  onClick={() => go(`?mode=view&id=${a.id}`)}
                />
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-gray-400 mt-10 italic">조건에 맞는 글이 없어.</div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
