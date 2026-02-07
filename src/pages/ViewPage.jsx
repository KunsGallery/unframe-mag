// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
// ✅ 주소창 파라미터를 읽어오기 위한 유틸 (router.js에 있다고 가정)
import { getParam, go } from "../utils/router"; 

// ✅ [Logic] 원본 서비스 로직 100% 유지
import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles"; 
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks"; 
import CommentBox from "../components/CommentBox"; 

/* ============================================================================
  🎨 [PX Design Config] 가로폭과 제목 크기를 조절하세요!
============================================================================ */
const VIEW_STYLE = {
  MAX_WIDTH: "1200px",       // 콘텐츠 최대 가로폭
  READING_WIDTH: "850px",    // 기사 본문 읽기 전용 너비
  HEADER_HEIGHT: "75vh",     // 상단 이미지 커버 높이
  TITLE_SIZE: "56px",        // 제목 글자 크기
};

function formatDate(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return ""; }
}

export default function ViewPage({ id, theme, toggleTheme }) {
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null); // ✅ 아임웹 높이 조절을 위한 참조

  // ✅ [Logic] 북마크 상태 관리 (원본 유지)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = useMemo(() => savedIds.includes(Number(a?.id)), [savedIds, a?.id]);

  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  /* --------------------------------------------------------------------------
    ✅ [핵심 해결책] 
    1. window.parent 대신 자신의 주소창(getParam)에서 ID를 읽습니다.
    2. Firebase 권한 오류가 나면 '비공개 글'임을 안내합니다.
  -------------------------------------------------------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // ✅ [수정] 위젯이 던져준 자신의 URL에서 id를 읽습니다.
        const idNum = Number(id || getParam("id"));

        if (!idNum) return;

        const article = await getArticleByIdNumber(idNum);
        if (!alive || !article) return;

        setA(article);

        // 조회수 증가 로직
        try { await bumpViews(idNum); } catch (e) { console.warn("Views +1 실패:", e); }
      } catch (e) {
        console.error("[ViewPage Error]", e);
        // 🔐 권한 오류가 나면 사용자에게 친절하게 안내합니다.
        if (e.code === 'permission-denied') {
          alert("이 글은 아직 '발행'되지 않았거나 관리자만 볼 수 있습니다. (Published 상태인지 확인해주세요!)");
        }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id, idNum]);

  /* --------------------------------------------------------------------------
    ✅ [UX] 아임웹 위젯 높이 자동 조절 (전송 로직)
  -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!loading && a && containerRef.current) {
      const sendHeight = () => {
        const height = containerRef.current.offsetHeight;
        window.parent.postMessage({ type: 'resize', height: height }, '*');
      };
      sendHeight();
      setTimeout(sendHeight, 1000); // 이미지 로딩 후 재측정
    }
  }, [loading, a]);

  // 좋아요 및 저장 로직 (원본 유지)
  async function onLike() {
    if (!a?.id) return;
    try {
      const next = await bumpLikes(Number(a.id));
      if (typeof next?.likes === "number") setA((p) => ({ ...p, likes: next.likes }));
    } catch (e) { alert("3시간 뒤에 다시 눌러주세요 💛"); }
  }

  if (loading) return <div className="py-40 text-center font-serif opacity-30 italic">Opening...</div>;
  if (!a) return <div className="py-40 text-center font-serif">Story missing. <button onClick={() => go("?mode=list")} className="underline">Back</button></div>;

  return (
    <div ref={containerRef} className="u-viewRoot bg-[#f4f1ea] min-h-screen pb-40 text-[#111]">
      {/* 🚀 매거진 헤더 디자인 */}
      <header className="relative w-full h-[75vh] flex items-center justify-center bg-black overflow-hidden" style={{ height: VIEW_STYLE.HEADER_HEIGHT }}>
        {a.cover && <img src={a.cover} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="cover" />}
        <div className="relative z-10 text-white text-center px-6">
          <span className="font-serif italic text-lg mb-4 block opacity-70 uppercase tracking-widest">Issue No.{a.id}</span>
          <h1 className="font-serif font-bold leading-tight max-w-5xl mx-auto" style={{ fontSize: VIEW_STYLE.TITLE_SIZE }}>{a.title}</h1>
          <p className="mt-8 font-mono text-[11px] opacity-40 uppercase tracking-widest">{formatDate(a.createdAt)}</p>
        </div>
      </header>

      {/* 🚀 매거진 본문 영역 */}
      <main className="mx-auto px-6 mt-24" style={{ maxWidth: VIEW_STYLE.READING_WIDTH }}>
        {a.excerpt && (
          <div className="border-l-4 border-black pl-8 mb-16 italic text-2xl text-gray-800 leading-relaxed font-serif">
            {a.excerpt}
          </div>
        )}

        {/* 액션 버튼 바 (원본 유지) */}
        <div className="flex justify-between items-center mb-16 pb-8 border-b border-black/5">
          <div className="flex gap-4">
            <button onClick={onLike} className="px-8 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest">💗 Like {a.likes || 0}</button>
            <button onClick={() => { toggleSaved(Number(a.id)); setSavedIds(getSavedIds()); }} 
                    className={`px-8 py-2 border border-black rounded-full text-[10px] font-bold uppercase tracking-widest ${saved ? "bg-black text-white" : ""}`}>
              {saved ? "★ Saved" : "☆ Save"}
            </button>
          </div>
          <div className="text-[11px] font-mono opacity-30 uppercase tracking-tighter">Views {a.views || 0}</div>
        </div>

        {/* ✅ TipTap 본문 HTML 출력 */}
        <div className="u-articleBody ProseMirror text-[19px] leading-[1.9]" dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }} />
        
        {/* ✅ [댓글 섹션] 원본 보존 완료! */}
        <div className="mt-40 pt-20 border-t-2 border-black">
          <h3 className="font-serif italic text-3xl mb-12">Conversation</h3>
          <CommentBox articleId={a.id} />
        </div>
      </main>
    </div>
  );
}