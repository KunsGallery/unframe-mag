// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { go, getParam } from "../utils/router";

// ✅ [Logic] 당신의 소중한 서비스 로직들 (원본 유지)
import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

/* ============================================================================
  🎨 [PX Design Config] 여기서 매거진의 세부 수치를 조절하세요!
============================================================================ */
const VIEW_CONFIG = {
  MAX_WIDTH: "1200px",       // 전체 레이아웃 최대폭
  READING_WIDTH: "850px",    // 본문 읽기 전용 너비 (매거진 표준)
  COVER_HEIGHT: "80vh",      // 상단 이미지 커버 높이
  TITLE_SIZE: "56px",        // 기사 제목 크기
};

/* ✅ [Utility] 원본 날짜 포맷팅 (원본 유지) */
function formatDate(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return ""; }
}

export default function ViewPage({ id, theme, toggleTheme }) {
  // ✅ [Logic] 원본 상태 관리 로직 (원본 유지)
  const idNum = id ? Number(id) : Number(getParam("id"));
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null); // 아임웹 높이 조절용

  // ✅ [Logic] 북마크(Saved) 상태 관리 및 동기화 (원본 유지)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = useMemo(() => savedIds.includes(Number(a?.id)), [savedIds, a?.id]);

  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  // ✅ [Logic] 글 로드 및 조회수(bumpViews) 로직 (원본 유지)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!idNum) return;

        const article = await getArticleByIdNumber(idNum);
        if (!alive || !article) return;

        setA(article);

        // 조회수 상승 (30분 쿨다운 로직 포함됨)
        try { await bumpViews(idNum); } catch (e) { console.warn("bumpViews failed:", e); }
      } catch (e) { console.error(e); setA(null); } 
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [idNum]);

  /* --------------------------------------------------------------------------
    ✅ [Logic] 사용자 인터랙션 함수 (원본 유지)
  -------------------------------------------------------------------------- */
  async function onLike() {
    if (!a?.id) return;
    try {
      // 좋아요 상승 (3시간 쿨다운 로직 포함됨)
      const next = await bumpLikes(Number(a.id));
      if (typeof next?.likes === "number") {
        setA((p) => ({ ...p, likes: next.likes }));
      } else {
        setA((p) => ({ ...p, likes: Number(p?.likes || 0) + 1 }));
      }
    } catch (e) {
      alert("이 글을 향한 애정은 3시간 뒤에 다시 보내주세요 💛");
    }
  }

  function onToggleSave() {
    if (!a?.id) return;
    const r = toggleSaved(Number(a.id));
    setSavedIds(r.ids);
    alert(saved ? "저장 해제했어요 🧹" : "저장했어요 ★ (기기 변경 시 저장도 사라져요)");
  }

  /* --------------------------------------------------------------------------
    ✅ [UX] 아임웹 아이프레임 높이 자동 조절 (추가)
  -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!loading && a && containerRef.current) {
      const sendHeight = () => {
        const height = containerRef.current.offsetHeight;
        window.parent.postMessage({ type: 'resize', height: height }, '*');
      };
      sendHeight();
      setTimeout(sendHeight, 1000); // 폰트/이미지 로딩 대기
    }
  }, [loading, a]);

  if (loading) return <div className="py-40 text-center font-serif opacity-30 italic">Unrolling the Letter...</div>;
  if (!a) return (
    <div className="py-40 text-center font-serif">
      글을 찾지 못했어요 🥲 <button onClick={() => go("?mode=list")} className="underline">리스트로</button>
    </div>
  );

  return (
    <div ref={containerRef} className="u-viewRoot bg-[#f4f1ea] min-h-screen pb-40 text-[#111]">
      
      {/* 🚀 [Navigation] 상단 바 (원본 버튼들 유지) */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="mx-auto flex justify-between items-center px-8 h-[60px]" style={{ maxWidth: VIEW_CONFIG.MAX_WIDTH }}>
          <div className="text-xl font-serif font-bold cursor-pointer" onClick={() => go("?mode=list")}>U#</div>
          <div className="flex gap-8 text-[11px] uppercase tracking-widest font-bold">
            <button onClick={() => go("?mode=list#archive")}>Archive</button>
            <button className="text-blue-600" onClick={() => go("?mode=list#archive&saved=1")}>Saved ({savedIds.length})</button>
            <button onClick={toggleTheme}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
          </div>
        </div>
      </nav>

      {/* 🚀 [Hero Section] 기사 커버 이미지 및 제목 */}
      <header className="relative w-full flex items-center justify-center bg-black overflow-hidden" style={{ height: VIEW_CONFIG.COVER_HEIGHT }}>
        {(a.coverMedium || a.coverThumb || a.cover) && (
          <img src={a.coverMedium || a.coverThumb || a.cover} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="cover" />
        )}
        <div className="relative z-10 text-white text-center px-6">
          <span className="font-serif italic text-lg mb-6 block tracking-[0.3em] uppercase opacity-70">
            {a.category || "Category"} — ISSUE NO.{a.id}
          </span>
          <h1 className="font-serif font-bold leading-tight max-w-5xl mx-auto" style={{ fontSize: VIEW_CONFIG.TITLE_SIZE }}>
            {a.title}
          </h1>
          <p className="mt-8 font-mono text-[11px] opacity-40 uppercase tracking-[0.4em]">Published on {formatDate(a.createdAt)}</p>
        </div>
      </header>

      {/* 🚀 [Content] 본문 영역 */}
      <main className="mx-auto px-6 mt-24" style={{ maxWidth: VIEW_CONFIG.READING_WIDTH }}>
        
        {/* 리드문 (Excerpt) (원본 유지) */}
        {a.excerpt && (
          <div className="border-l-4 border-black pl-10 mb-16 italic text-2xl text-gray-800 leading-relaxed font-serif">
            {a.excerpt}
          </div>
        )}

        {/* 액션 바: 좋아요, 저장, 수정 (원본 유지) */}
        <div className="flex justify-between items-center mb-16 pb-8 border-b border-black/5">
          <div className="flex gap-4">
            <button onClick={onLike} className="px-8 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all">
              💗 Like {a.likes || 0}
            </button>
            <button onClick={onToggleSave} className={`px-8 py-2 border border-black rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${saved ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>
              {saved ? "★ Saved" : "☆ Save"}
            </button>
          </div>
          <div className="flex gap-6 items-center">
             <div className="flex gap-4 text-[11px] font-mono opacity-30 uppercase tracking-tighter">
               <span>Views {a.views || 0}</span>
             </div>
             <button onClick={() => go(`?mode=editor&id=${a.id}`)} className="text-[11px] font-bold uppercase border-b border-black hover:opacity-50 transition-opacity">Edit Article</button>
          </div>
        </div>

        {/* ✅ [Body] 실제 TipTap 본문 HTML (원본 유지) */}
        <div className="u-articleBody ProseMirror text-[19px] leading-[1.9] text-gray-900" 
             dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }} />
        
        {/* 🚀 [Comments] 댓글 섹션 (당신이 찾던 바로 그 기능! 원본 유지) */}
        <div className="mt-40 pt-20 border-t-2 border-black">
          <h3 className="font-serif italic text-3xl mb-12">Conversation</h3>
          <CommentBox articleId={a.id} />
        </div>

      </main>
    </div>
  );
}