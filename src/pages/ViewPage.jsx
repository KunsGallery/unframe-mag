import React, { useEffect, useMemo, useState, useRef } from "react";
import { go, getParam } from "../utils/router";
import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

export default function ViewPage({ id, theme, toggleTheme }) {
  // ✅ [ReferenceError 수정] idNum을 최상단에서 안전하게 계산합니다.
  const idFromUrl = getParam("id");
  const idNum = id ? Number(id) : (idFromUrl ? Number(idFromUrl) : null);

  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = useMemo(() => savedIds.includes(Number(a?.id)), [savedIds, a?.id]);

  useEffect(() => { const off = onSavedChanged(ids => setSavedIds(ids)); return off; }, []);

  // ✅ 데이터 로드 및 조회수 증가 (원본 로직 100% 보존)
  useEffect(() => {
    let alive = true;
    if (!idNum) { setLoading(false); return; }
    (async () => {
      try {
        setLoading(true);
        const article = await getArticleByIdNumber(idNum);
        if (!alive || !article) return;
        setA(article);
        try { await bumpViews(idNum); } catch (e) { console.warn(e); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [idNum]);

  // ✅ 좋아요 기능 (원본 유지)
  async function onLike() {
    if (!a?.id) return;
    try {
      const next = await bumpLikes(Number(a.id));
      if (typeof next?.likes === "number") setA(p => ({ ...p, likes: next.likes }));
    } catch { alert("3시간 뒤에 다시 눌러주세요 💛"); }
  }

  if (loading) return <div className="py-40 text-center font-serif opacity-30 italic">Unrolling the Letter...</div>;
  if (!a) return <div className="py-40 text-center font-serif">Story not found. <button onClick={() => go("?mode=list")} className="underline">Back</button></div>;

  return (
    <div className="u-viewRoot bg-[#f4f1ea] min-h-screen pb-40 text-[#111]">
      <header className="relative w-full h-[80vh] flex items-center justify-center bg-black overflow-hidden">
        {a.cover && <img src={a.cover} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="cover" />}
        <div className="relative z-10 text-white text-center px-6">
          <span className="font-serif italic text-lg mb-6 block tracking-[0.3em] uppercase opacity-70">No.{a.id}</span>
          <h1 className="font-serif font-bold leading-tight max-w-5xl mx-auto text-[56px] md:text-[72px]">{a.title}</h1>
        </div>
      </header>

      <main className="mx-auto px-6 mt-24 max-w-[820px]">
        {a.excerpt && <div className="border-l-4 border-black pl-10 mb-20 italic text-2xl text-gray-800 font-serif leading-relaxed">{a.excerpt}</div>}
        
        <div className="flex justify-between items-center mb-16 pb-8 border-b border-black/5">
          <div className="flex gap-4">
            <button onClick={onLike} className="px-8 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all">💗 Like {a.likes || 0}</button>
            <button onClick={() => { toggleSaved(Number(a.id)); setSavedIds(getSavedIds()); }} className={`px-8 py-2 border border-black rounded-full text-[10px] font-bold uppercase tracking-widest ${saved ? "bg-black text-white" : ""}`}>{saved ? "★ Saved" : "☆ Save"}</button>
          </div>
          <div className="text-[11px] font-mono opacity-30">Views {a.views || 0}</div>
        </div>

        <div className="u-articleBody ProseMirror text-[19px] leading-[1.9] text-gray-900" dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }} />
        
        {/* ✅ 빼먹지 않은 소중한 댓글 섹션 */}
        <div className="mt-40 pt-20 border-t-2 border-black">
          <h3 className="font-serif italic text-3xl mb-12 italic">Conversation</h3>
          <CommentBox articleId={a.id} />
        </div>
      </main>
    </div>
  );
}