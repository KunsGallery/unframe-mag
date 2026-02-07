// src/pages/ListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { go, getParam } from "../utils/router"; 
import { getSavedIds, onSavedChanged } from "../services/bookmarks"; 
import { getEditorPickIds } from "../services/config"; 
import { getPublishedArticles } from "../services/articles"; 
import ArticleCard from "../components/ArticleCard"; 

/* ============================================================================
  🎨 [PX Design Config]
============================================================================ */
const DESIGN_CONFIG = {
  MAX_WIDTH: "1280px",
  NAV_HEIGHT: "70px",
  PAGE_SIZE: 6,
  IMWEB_URL: "https://unframe.kr", // ✅ 당신의 실제 아임웹 도메인으로 확인해주세요!
};

const CATEGORIES = [
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01", img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000" },
  { key: "Project", label: "Project", sub: "CATEGORY 02", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03", img: "https://images.unsplash.com/photo-1460661419201-fd4ce18a8024?q=80&w=1000" },
  { key: "News", label: "News", sub: "CATEGORY 04", img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000" },
];

export default function ListPage({ theme, toggleTheme }) {
  const archiveRef = useRef(null);
  const subscribeRef = useRef(null);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navDark, setNavDark] = useState(false);
  const [savedIds, setSavedIds] = useState(() => getSavedIds());

  /* --------------------------------------------------------------------------
    ✅ [핵심 해결책] 게시글 클릭 시 부모창(아임웹)의 주소를 바꾸는 함수
  -------------------------------------------------------------------------- */
  const handleArticleClick = (id) => {
    // 1. 이동할 아임웹의 상세 페이지 주소를 만듭니다.
    const targetUrl = `${DESIGN_CONFIG.IMWEB_URL}/article?id=${id}`;
    
    // 2. 부모창(window.parent)의 위치를 강제로 이동시킵니다.
    // 이렇게 하면 브라우저 주소창이 /article?id=...로 바뀌면서 ViewPage 위젯이 실행됩니다.
    window.parent.location.href = targetUrl;
  };

  useEffect(() => {
    const handleScroll = () => setNavDark(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const articles = await getPublishedArticles();
        setAll(articles || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const pageItems = useMemo(() => all.slice(0, DESIGN_CONFIG.PAGE_SIZE), [all]);

  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="u-listRoot overflow-x-hidden">
      {/* 네비게이션 */}
      <nav className={`fixed top-0 left-0 w-full z-[100] transition-colors duration-500 ${navDark ? "bg-white text-black" : "bg-transparent text-white"}`}>
        <div className="mx-auto flex justify-between items-center px-8" style={{ maxWidth: DESIGN_CONFIG.MAX_WIDTH, height: DESIGN_CONFIG.NAV_HEIGHT }}>
          <div className="text-2xl font-serif font-bold cursor-pointer" onClick={() => window.location.reload()}>U#</div>
          <div className="flex gap-8 text-[10px] uppercase font-bold tracking-widest">
            <button onClick={() => scrollTo(archiveRef)}>Archive</button>
            <button onClick={() => scrollTo(subscribeRef)}>Subscription</button>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="h-screen bg-black flex items-center justify-center text-white text-center">
        <div>
          <p className="font-serif italic mb-4">ArtNearYou</p>
          <h1 className="text-6xl font-serif font-bold mb-6">Any Letter <br/> That Inspires You.</h1>
        </div>
      </section>

      {/* 카테고리 섹션 */}
      <section className="flex h-[60vh]">
        {CATEGORIES.map(cat => (
          <div key={cat.key} className="flex-1 relative group cursor-pointer overflow-hidden grayscale hover:grayscale-0 transition-all duration-700" 
               onClick={() => scrollTo(archiveRef)}>
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" style={{ backgroundImage: `url(${cat.img})` }} />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-10 left-10 text-white">
              <h2 className="text-3xl font-serif font-bold">{cat.label}</h2>
            </div>
          </div>
        ))}
      </section>

      {/* 아카이브 리스트 섹션 */}
      <section ref={archiveRef} className="py-32 mx-auto" style={{ maxWidth: DESIGN_CONFIG.MAX_WIDTH }}>
        <h3 className="font-serif text-3xl mb-16 border-b border-black pb-4 text-center">Archive</h3>
        {loading ? (
          <div className="text-center opacity-30 italic">Loading articles...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-6">
            {pageItems.map(a => (
              /* ✅ 여기서 handleArticleClick을 실행합니다! */
              <ArticleCard key={a.id} a={a} onClick={() => handleArticleClick(a.id)} />
            ))}
          </div>
        )}
      </section>

      {/* 구독 섹션 */}
      <section ref={subscribeRef} className="py-32 bg-[#F9F9F9] text-center">
        <h2 className="font-serif text-4xl font-bold mb-8">Join the UNFRAME.</h2>
        <div className="max-w-md mx-auto flex border-b-2 border-black pb-2">
          <input type="email" placeholder="Your email" className="flex-1 bg-transparent outline-none" />
          <button className="font-bold uppercase tracking-widest">Join</button>
        </div>
      </section>

      <footer className="py-12 text-center text-[10px] opacity-30 tracking-[0.2em]">
        © 2026 UNFRAME MAG. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}