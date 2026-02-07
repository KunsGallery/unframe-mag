import React, { useEffect, useMemo, useState } from "react";
import { go, getParam } from "../utils/router";
import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

export default function ViewPage({ id, theme, toggleTheme }) {
  /* --------------------------------------------------------------------------
    ✅ [Logic] 데이터 및 인터랙션 (원본 보존)
  -------------------------------------------------------------------------- */
  const idNum = id ? Number(id) : Number(getParam("id"));
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = useMemo(() => savedIds.includes(Number(a?.id)), [savedIds, a?.id]);

  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!idNum) return;
        const article = await getArticleByIdNumber(idNum);
        if (!alive || !article) return;
        setA(article);
        try { await bumpViews(idNum); } catch (e) { console.warn(e); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [idNum]);

  async function onLike() {
    if (!a?.id) return;
    try {
      const next = await bumpLikes(Number(a.id));
      if (typeof next?.likes === "number") setA((p) => ({ ...p, likes: next.likes }));
    } catch (e) { alert("이 글을 향한 애정은 3시간 뒤에 다시 보내주세요 💛"); }
  }

  /* --------------------------------------------------------------------------
    🚀 [Design] 우아한 매거진 기사 레이아웃
  -------------------------------------------------------------------------- */
  if (loading) return <div className="py-40 text-center font-serif opacity-30 italic tracking-widest">Opening Archive...</div>;
  if (!a) return <div className="py-40 text-center font-serif tracking-widest">No Letter Found. <button onClick={() => go("?mode=list")} className="underline">Back</button></div>;

  return (
    <div className="u-viewRoot bg-[#f4f1ea] min-h-screen pb-40 text-[#111]">
      {/* 1. 상단 이미지 커버 (75vh 높이로 압도적 연출) */}
      <header className="relative w-full h-[75vh] flex items-center justify-center bg-black overflow-hidden">
        {(a.coverMedium || a.cover) && (
          <img src={a.coverMedium || a.cover} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="cover" />
        )}
        <div className="relative z-10 text-white text-center px-6">
          <span className="font-serif italic text-lg mb-6 block tracking-[0.3em] uppercase opacity-70">
            {a.category} — ISSUE NO.{a.id}
          </span>
          <h1 className="font-serif font-bold leading-tight max-w-5xl mx-auto text-[56px] md:text-[72px]">
            {a.title}
          </h1>
          <p className="mt-8 font-mono text-[11px] opacity-40 uppercase tracking-[0.4em]">Published on {new Date(a.createdAt).toLocaleDateString()}</p>
        </div>
      </header>

      {/* 2. 본문 영역 (가독성을 위한 800px 폭) */}
      <main className="mx-auto px-6 mt-20 max-w-[800px]">
        {/* 리드문 (Excerpt) */}
        {a.excerpt && (
          <div className="border-l-4 border-black pl-10 mb-20 italic text-2xl text-gray-800 leading-relaxed font-serif">
            {a.excerpt}
          </div>
        )}

        {/* 액션 컨트롤러 */}
        <div className="flex justify-between items-center mb-16 pb-8 border-b border-black/5">
          <div className="flex gap-4">
            <button onClick={onLike} className="px-8 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-all">
              💗 Like {a.likes || 0}
            </button>
            <button onClick={() => { toggleSaved(Number(a.id)); setSavedIds(getSavedIds()); }} 
              className={`px-8 py-2 border border-black rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${saved ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>
              {saved ? "★ Saved" : "☆ Save"}
            </button>
          </div>
          <div className="text-[11px] font-mono opacity-30 uppercase tracking-tighter">
            Views {a.views || 0}
          </div>
        </div>

        {/* ✅ [Body] 당신의 에디터에서 작성된 실제 HTML */}
        <div className="u-articleBody ProseMirror text-[19px] leading-[1.9] text-gray-900" 
          dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }} />
        
        {/* 댓글 섹션 */}
        <div className="mt-32 pt-20 border-t-2 border-black">
          <CommentBox articleId={a.id} />
        </div>
      </main>
    </div>
  );
}