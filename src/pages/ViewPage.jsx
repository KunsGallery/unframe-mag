// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { go, getParam } from "../utils/router";

// ✅ [Logic] 기존 서비스 로직 100% 유지
import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles"; 
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks"; 
import CommentBox from "../components/CommentBox"; 

/* ============================================================================
  🎨 [PX Design Config] 여기서 매거진의 세부 디자인 수치를 조절하세요!
============================================================================ */
const VIEW_DESIGN = {
  MAX_WIDTH: "1200px",       // 전체 레이아웃의 최대 가로폭
  READING_WIDTH: "820px",    // 본문 기사가 읽히는 최적의 너비 (px)
  COVER_HEIGHT: "75vh",      // 상단 기사 커버 이미지의 높이 (화면의 75%)
  TITLE_SIZE: "52px",        // 기사 제목의 크기 (px)
  BODY_LINE_HEIGHT: "1.9",   // 본문 줄 간격 (읽기 편하게 조절)
};

/* ✅ 날짜 포맷팅 함수 (원본 유지) */
function formatDate(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return ""; }
}

export default function ViewPage({ id, theme, toggleTheme }) {
  // ✅ [수정 핵심] idNum을 useEffect 밖에서 계산하여 ReferenceError를 원천 차단합니다.
  // 아이프레임 안이든 밖이든 주소창의 id 파라미터를 정확히 읽어옵니다.
  const idFromParams = getParam("id");
  const idNum = id ? Number(id) : (idFromParams ? Number(idFromParams) : null);

  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null); // 아임웹 위젯 높이 자동 조절용

  // ✅ [Logic] 북마크(Saved) 상태 관리 및 동기화 (원본 유지)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = useMemo(() => savedIds.includes(Number(a?.id)), [savedIds, a?.id]);

  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  // ✅ [Logic] 데이터 로드 및 조회수(bumpViews) 로직 (원본 유지)
  useEffect(() => {
    let alive = true;
    if (!idNum) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const article = await getArticleByIdNumber(idNum);
        
        if (!alive) return;
        if (!article) { setA(null); return; }

        setA(article);

        // 조회수 상승 (서비스 레이어의 쿨다운 로직을 따름)
        try { await bumpViews(idNum); } catch (e) { console.warn("bumpViews skip:", e); }
      } catch (e) {
        console.error("[ViewPage Fetch Error]", e);
        setA(null);
      } finally { if (alive) setLoading(false); }
    })();

    return () => { alive = false; };
  }, [idNum]); // 이제 idNum이 정의되어 있어 에러가 나지 않습니다!

  /* --------------------------------------------------------------------------
    ✅ [UX] 아임웹 아이프레임 높이 자동 조절 로직
  -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!loading && a && containerRef.current) {
      const sendHeight = () => {
        const height = containerRef.current.offsetHeight;
        // 부모창(아임웹)에 현재 콘텐츠의 높이를 전송합니다.
        window.parent.postMessage({ type: 'resize', height: height }, '*');
      };
      sendHeight();
      setTimeout(sendHeight, 1000); // 이미지 로드 대기 후 재측정
    }
  }, [loading, a]);

  /* --------------------------------------------------------------------------
    ✅ [Action] 좋아요 및 저장 버튼 함수 (원본 유지)
  -------------------------------------------------------------------------- */
  async function onLike() {
    if (!a?.id) return;
    try {
      const next = await bumpLikes(Number(a.id));
      if (typeof next?.likes === "number") setA((p) => ({ ...p, likes: next.likes }));
    } catch (e) {
      alert("이 글을 향한 애정은 3시간 뒤에 다시 보내주세요 💛");
    }
  }

  function onToggleSave() {
    if (!a?.id) return;
    const r = toggleSaved(Number(a.id));
    setSavedIds(r.ids);
  }

  if (loading) return <div className="py-40 text-center font-serif opacity-30 italic">Reading the Archive...</div>;
  if (!a) return (
    <div className="py-40 text-center font-serif">
      글을 찾지 못했어요 🥲 <button onClick={() => go("?mode=list")} className="underline">리스트로 가기</button>
    </div>
  );

  return (
    <div ref={containerRef} className="u-viewRoot bg-[#f4f1ea] min-h-screen pb-40 text-[#111]">
      
      {/* 🚀 [Navigation] 매거진 상단 네비게이션 */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="mx-auto flex justify-between items-center px-8 h-[60px]" style={{ maxWidth: VIEW_DESIGN.MAX_WIDTH }}>
          <div className="text-xl font-serif font-bold cursor-pointer" onClick={() => go("?mode=list")}>U#</div>
          <div className="flex gap-8 text-[11px] uppercase tracking-widest font-bold">
            <button onClick={() => go("?mode=list#archive")}>Archive</button>
            <button className="text-blue-600" onClick={() => go("?mode=list#archive&saved=1")}>Saved ({savedIds.length})</button>
            <button onClick={toggleTheme}>{theme === "dark" ? "🌙" : "☀️"}</button>
          </div>
        </div>
      </nav>

      {/* 🚀 [Hero Header] 매거진 커버 섹션 */}
      <header className="relative w-full flex items-center justify-center bg-black overflow-hidden" style={{ height: VIEW_DESIGN.COVER_HEIGHT }}>
        {(a.coverMedium || a.coverThumb || a.cover) && (
          <img src={a.coverMedium || a.coverThumb || a.cover} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="cover" />
        )}
        <div className="relative z-10 text-white text-center px-6">
          <span className="font-serif italic text-lg mb-6 block tracking-[0.3em] uppercase opacity-70">
            {a.category || "Category"} — ISSUE NO.{a.id}
          </span>
          <h1 className="font-serif font-bold leading-tight max-w-5xl mx-auto" style={{ fontSize: VIEW_DESIGN.TITLE_SIZE }}>
            {a.title}
          </h1>
          <p className="mt-8 font-mono text-[11px] opacity-40 uppercase tracking-[0.4em]">Published on {formatDate(a.createdAt)}</p>
        </div>
      </header>

      {/* 🚀 [Main Content] 기사 본문 영역 */}
      <main className="mx-auto px-6 mt-24" style={{ maxWidth: VIEW_DESIGN.READING_WIDTH }}>
        
        {/* 리드문 (Excerpt) */}
        {a.excerpt && (
          <div className="border-l-4 border-black pl-10 mb-16 italic text-2xl text-gray-800 leading-relaxed font-serif">
            {a.excerpt}
          </div>
        )}

        {/* 인터랙션 바: 좋아요, 저장, 수정 */}
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
             {/* 관리자 기능을 위한 수정 버튼 */}
             <button onClick={() => go(`?mode=editor&id=${a.id}`)} className="text-[11px] font-bold uppercase border-b border-black hover:opacity-50 transition-opacity">Edit Article</button>
          </div>
        </div>

        {/* ✅ [Body] TipTap 본문 HTML 출력 (원본 유지) */}
        <div className="u-articleBody ProseMirror text-[19px]" 
             style={{ lineHeight: VIEW_DESIGN.BODY_LINE_HEIGHT }}
             dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }} />
        
        {/* 🚀 [Comments] 댓글 섹션 (당신이 찾던 그 기능! 원본 유지) */}
        <div className="mt-40 pt-20 border-t-2 border-black">
          <h3 className="font-serif italic text-3xl mb-12">Conversation</h3>
          <CommentBox articleId={a.id} />
        </div>

      </main>

      {/* ✅ [Footer] 푸터 (간략화) */}
      <footer className="mt-40 py-20 border-t border-black/5 text-center">
        <div className="text-[10px] uppercase tracking-[0.4em] opacity-20">
          © 2026 UNFRAME MAG — ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}