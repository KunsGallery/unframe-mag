import React, { useEffect, useMemo, useRef, useState } from "react";
import { go, getParam } from "../utils/router"; // 주소 이동 및 파라미터 읽기 유틸
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks"; // 북마크(로컬스토리지) 서비스
import { getEditorPickIds } from "../services/config"; // 에디터 픽 설정 불러오기
import { getPublishedArticles } from "../services/articles"; // 발행된 글 목록 불러오기
import ArticleCard from "../components/ArticleCard"; // 아까 개편한 매거진 스타일 카드 컴포넌트

/* ============================================================================
  🎨 [커스터마이징 영역] px 단위로 자유롭게 조절하세요!
============================================================================ */
const DESIGN_CONFIG = {
  MAX_WIDTH: "1280px",      // 전체 섹션의 최대 가로폭
  NAV_HEIGHT: "70px",       // 상단 네비게이션의 높이
  SECTION_GAP: "120px",     // 섹션과 섹션 사이의 간격 (여백의 미!)
  
  // 텍스트 사이즈 설정 (px)
  FONT_SIZE: {
    HERO_TITLE: "72px",     // 히어로 섹션 메인 타이틀
    SECTION_TITLE: "42px",  // 각 섹션의 큰 제목
    BODY_TEXT: "16px",      // 일반 본문 크기
    SMALL_LABEL: "12px",    // 캡션이나 작은 라벨
  },
  
  // 기타 설정
  PAGE_SIZE: 6,             // 아카이브 섹션에서 한 번에 보여줄 글 개수
  HERO_IMG: "https://i.ibb.co/1GcrN63k/Gemini-Generated-Image-6n2lmx6n2lmx6n2l.jpg", // 히어로 배경
};

// 카테고리 설정 (이미지 URL은 실제 운영하시는 이미지로 교체하세요!)
const CATEGORIES = [
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01", img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1000" },
  { key: "Project", label: "Project", sub: "CATEGORY 02", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03", img: "https://images.unsplash.com/photo-1460661419201-fd4ce18a8024?q=80&w=1000" },
  { key: "News", label: "News", sub: "CATEGORY 04", img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000" },
];

/* ============================================================================
  🛠 [유틸리티 함수] 데이터를 예쁘게 가공합니다.
============================================================================ */
function formatDate(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return ""; }
}

export default function ListPage({ theme, toggleTheme }) {
  // ✅ [Ref] 특정 위치로 스크롤을 보내기 위한 이정표들
  const archiveRef = useRef(null);
  const subscribeRef = useRef(null);

  // ✅ [State] 데이터 및 UI 상태 관리
  const [all, setAll] = useState([]); // 전체 글 목록
  const [loading, setLoading] = useState(true);
  const [pickArticles, setPickArticles] = useState([]); // 에디터 픽 데이터
  const [navDark, setNavDark] = useState(false); // 스크롤에 따른 네비 색상 상태 변경용
  const [savedIds, setSavedIds] = useState(() => getSavedIds()); // 북마크된 ID 목록

  // ✅ https://www.lingq.com/en/learn-korean-online/translate/ko/%EC%83%81%ED%83%9C/ 주소창의 정보를 읽어와서 필터 상태로 변환
  const [activeCat, setActiveCat] = useState(getParam("cat") || "All");
  const [sortBy, setSortBy] = useState(getParam("sort") || "latest");
  const [q, setQ] = useState(getParam("q") || "");
  const [savedMode, setSavedMode] = useState(getParam("saved") === "1");
  const [page, setPage] = useState(Number(getParam("page")) || 1);

  // ✅ [Effect] 스크롤 위치 감지 (네비게이션 컬러 변경용)
  useEffect(() => {
    const handleScroll = () => {
      // 히어로 섹션 높이(약 80vh)를 지나면 네비게이션 색상을 어둡게 변경
      setNavDark(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ [Effect] 데이터 불러오기 (글 목록 & 에디터 픽)
  useEffect(() => {
    (async () => {
      try {
        const [articles, pickIds] = await Promise.all([getPublishedArticles(), getEditorPickIds()]);
        setAll(articles || []);
        // Pick ID와 전체 데이터를 매칭해서 실제 Pick 글 데이터 구성
        const picked = (pickIds || []).map(id => articles.find(a => Number(a.id) === Number(id))).filter(Boolean);
        setPickArticles(picked);
      } finally { setLoading(false); }
    })();
  }, []);

  // ✅ [Logic] 필터링 및 정렬된 목록 계산 (useMemo로 성능 최적화)
  const filteredItems = useMemo(() => {
    let list = [...all];
    if (savedMode) list = list.filter(a => savedIds.includes(Number(a.id))); // 저장된 글 모드
    if (activeCat !== "All") list = list.filter(a => a.category === activeCat); // 카테고리 필터
    if (q.trim()) { // 검색어 필터
      const keyword = q.toLowerCase();
      list = list.filter(a => a.title?.toLowerCase().includes(keyword) || a.tags?.some(t => t.toLowerCase().includes(keyword)));
    }
    // 정렬 (최신순 vs 인기순)
    list.sort((a, b) => sortBy === "latest" ? b.createdAt - a.createdAt : (b.views + b.likes) - (a.views + a.likes));
    return list;
  }, [all, activeCat, sortBy, q, savedMode, savedIds]);

  // ✅ [Page] 현재 페이지에 보여줄 6개의 데이터 슬라이스
  const pageItems = filteredItems.slice((page - 1) * DESIGN_CONFIG.PAGE_SIZE, page * DESIGN_CONFIG.PAGE_SIZE);

  // ✅ [Helper] 공통 기능 함수들
  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth" });
  
  const updateFilter = (updates) => {
    // 필터 변경 시 주소창(URL)도 함께 업데이트하여 뒤로가기 지원
    const next = { page, cat: activeCat, sort: sortBy, q, saved: savedMode, ...updates };
    const params = new URLSearchParams();
    if (next.cat !== "All") params.set("cat", next.cat);
    if (next.sort !== "latest") params.set("sort", next.sort);
    if (next.q) params.set("q", next.q);
    if (next.saved) params.set("saved", "1");
    params.set("page", next.page);
    go(`?${params.toString()}`);
    
    // 실제 상태값 반영
    if (updates.cat !== undefined) setActiveCat(updates.cat);
    if (updates.sort !== undefined) setSortBy(updates.sort);
    if (updates.q !== undefined) setQ(updates.q);
    if (updates.saved !== undefined) setSavedMode(updates.saved);
    if (updates.page !== undefined) setPage(updates.page);
  };

  return (
    <div className="u-listRoot overflow-x-hidden">
      
      {/* 🚀 [0. Navigation] 상단에 붙어서 따라오는 메뉴 */}
      <nav className={`fixed top-0 left-0 w-full z-[100] transition-colors duration-500 ${navDark ? "bg-white/90 backdrop-blur-md text-black shadow-sm" : "bg-transparent text-white"}`}>
        <div className="mx-auto flex justify-between items-center px-8" style={{ maxWidth: DESIGN_CONFIG.MAX_WIDTH, height: DESIGN_CONFIG.NAV_HEIGHT }}>
          <div className="text-2xl font-serif font-bold cursor-pointer" onClick={() => window.location.reload()}>U#</div>
          <div className="flex gap-8 text-xs font-medium uppercase tracking-widest items-center">
            <a href="https://unframe.imweb.me" className="hover:opacity-60 transition-opacity">Back UNFRAME</a>
            <button onClick={() => scrollTo(archiveRef)} className="hover:opacity-60">Archive</button>
            <button onClick={() => scrollTo(subscribeRef)} className="hover:opacity-60">Subscription</button>
            <button onClick={() => { updateFilter({ saved: true, cat: "All", page: 1 }); scrollTo(archiveRef); }} className="px-3 py-1 border border-current rounded-full">
              Saved ({savedIds.length})
            </button>
          </div>
        </div>
      </nav>

      {/* 🚀 [1. Hero Section] 강렬한 첫인상 */}
      <section className="relative h-screen flex items-center justify-center text-center bg-cover bg-center" style={{ backgroundImage: `url(${DESIGN_CONFIG.HERO_IMG})` }}>
        <div className="absolute inset-0 bg-black/30" /> {/* 이미지 어둡게 처리 */}
        <div className="relative z-10 text-white px-4">
          <p className="font-serif italic text-lg mb-4 opacity-80">ArtNearYou</p>
          <h1 className="font-serif font-bold leading-tight mb-6" style={{ fontSize: DESIGN_CONFIG.FONT_SIZE.HERO_TITLE }}>Any Letter <br/> That Inspires You.</h1>
          <p className="text-sm tracking-[0.2em] opacity-70">A music newsletter that delivers classical music in words.</p>
        </div>
      </section>

      {/* 🚀 [2. Interactive Categories] 마우스 오버 시 폭이 변하는 섹션 */}
      <section className="flex h-[70vh] w-full overflow-hidden">
        {CATEGORIES.map((cat) => (
          <div 
            key={cat.key}
            onClick={() => { updateFilter({ cat: cat.key, saved: false, page: 1 }); scrollTo(archiveRef); }}
            className="group relative flex-[1] hover:flex-[1.5] transition-all duration-700 cursor-pointer overflow-hidden border-r border-white/10 last:border-0 grayscale hover:grayscale-0"
          >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" style={{ backgroundImage: `url(${cat.img})` }} />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            <div className="absolute bottom-12 left-10 text-white">
              <span className="text-[10px] tracking-[0.3em] uppercase opacity-70 mb-2 block">{cat.sub}</span>
              <h2 className="text-4xl font-serif font-bold mb-4">{cat.label}</h2>
              <p className="text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">VIEW GALLERY →</p>
            </div>
          </div>
        ))}
      </section>

      {/* 🚀 [3. Marquee Section] 흘러가는 텍스트 배경 */}
      <section className="py-20 bg-black text-white overflow-hidden relative">
        <div className="flex whitespace-nowrap animate-marquee font-serif italic text-6xl opacity-20 select-none">
          <span className="mx-4">UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS •</span>
          <span className="mx-4">UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS •</span>
        </div>
        {/* 미니 구독 폼 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-4 items-center bg-white/10 p-2 pl-6 rounded-full backdrop-blur-md border border-white/20">
            <span className="text-xs tracking-widest uppercase">📮 Stay Updated</span>
            <input type="email" placeholder="email@example.com" className="bg-transparent border-none outline-none text-sm w-64" />
            <button className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold uppercase hover:bg-gray-200 transition-colors">Join</button>
          </div>
        </div>
      </section>

      {/* 🚀 [4. Editor's Choice] 에디터 노트 & 픽 */}
      <section className="py-24 mx-auto grid grid-cols-1 md:grid-cols-2 gap-20" style={{ maxWidth: DESIGN_CONFIG.MAX_WIDTH }}>
        <div className="border-t-2 border-black pt-8">
          <h3 className="font-serif text-sm uppercase tracking-widest mb-8">Editor's Note</h3>
          <p className="text-2xl font-serif leading-relaxed italic text-gray-700">"가장 개인적인 것이 가장 창의적이다. 언프레임 매거진은 당신의 일상 속에 숨어있는 예술적 영감을 발견하고 기록합니다."</p>
        </div>
        <div className="border-t-2 border-black pt-8">
          <h3 className="font-serif text-sm uppercase tracking-widest mb-8">Editor's Pick</h3>
          <div className="flex flex-col gap-6">
            {pickArticles.map(a => (
              <div key={a.id} className="group cursor-pointer flex justify-between items-center" onClick={() => go(`?mode=view&id=${a.id}`)}>
                <h4 className="text-xl font-bold group-hover:underline">{a.title}</h4>
                <span className="text-xs opacity-40 uppercase font-mono tracking-tighter">No.{a.id}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 [5. Archive Section] 좌측 스티키 메뉴 + 메인 리스트 */}
      <section ref={archiveRef} className="py-24 border-t border-black/5 mx-auto flex gap-20" style={{ maxWidth: DESIGN_CONFIG.MAX_WIDTH }}>
        
        {/* 좌측 스티키 사이드바 */}
        <aside className="w-48 shrink-0">
          <div className="sticky top-32 flex flex-col gap-4">
            <h3 className="font-serif text-sm uppercase tracking-[0.3em] mb-4 border-b border-black pb-2">Archive</h3>
            {["All", ...CATEGORIES.map(c => c.key)].map(catName => (
              <button 
                key={catName} 
                onClick={() => updateFilter({ cat: catName, saved: false, page: 1 })}
                className={`text-left text-lg font-serif transition-all hover:pl-2 ${activeCat === catName && !savedMode ? "font-bold text-blue-600" : "opacity-40"}`}
              >
                {catName}
              </button>
            ))}
            <button 
              onClick={() => updateFilter({ saved: true, cat: "All", page: 1 })}
              className={`text-left text-lg font-serif transition-all hover:pl-2 mt-4 ${savedMode ? "font-bold text-blue-600" : "opacity-40"}`}
            >
              Saved ★
            </button>
          </div>
        </aside>

        {/* 우측 메인 콘텐츠 */}
        <div className="flex-1">
          {/* 상단 컨트롤러 (정렬 & 검색) */}
          <div className="flex justify-between items-end mb-12">
            <div className="flex gap-6 text-[11px] uppercase tracking-widest font-bold">
              <button onClick={() => updateFilter({ sort: "latest", page: 1 })} className={sortBy === "latest" ? "text-black border-b border-black" : "opacity-30"}>Latest</button>
              <button onClick={() => updateFilter({ sort: "popular", page: 1 })} className={sortBy === "popular" ? "text-black border-b border-black" : "opacity-30"}>Popular</button>
            </div>
            <div className="relative">
              <input 
                type="text" 
                value={q} 
                onChange={(e) => updateFilter({ q: e.target.value, page: 1 })}
                placeholder="Search anything..." 
                className="bg-transparent border-b border-black/20 focus:border-black outline-none pb-1 w-64 text-sm"
              />
            </div>
          </div>

          {/* 아티클 그리드 (최대 6개) */}
          {loading ? (
            <div className="py-20 text-center opacity-30 italic">Loading library...</div>
          ) : pageItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {pageItems.map(a => (
                <ArticleCard key={a.id} a={a} onClick={() => go(`?mode=view&id=${a.id}`)} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center opacity-30 italic">No letters found in this category.</div>
          )}

          {/* 페이지네이션 */}
          {filteredItems.length > DESIGN_CONFIG.PAGE_SIZE && (
            <div className="mt-20 flex justify-center gap-4 items-center">
              {Array.from({ length: Math.ceil(filteredItems.length / DESIGN_CONFIG.PAGE_SIZE) }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => { updateFilter({ page: i + 1 }); scrollTo(archiveRef); }}
                  className={`w-8 h-8 rounded-full text-xs font-mono transition-colors ${page === i + 1 ? "bg-black text-white" : "border border-black/10 hover:bg-black/5"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 🚀 [6. Full Subscription] 화면 가득 채우는 구독 섹션 */}
      <section ref={subscribeRef} className="py-32 bg-[#F9F9F9] flex flex-col items-center justify-center text-center px-4">
        <h2 className="font-serif text-5xl font-bold mb-6">Join the UNFRAME.</h2>
        <p className="text-gray-500 mb-12 max-w-md leading-relaxed">매주 수요일 오전 8시, 당신의 메일함으로 <br/> 예술가의 시선이 담긴 편지를 보내드립니다.</p>
        <div className="w-full max-w-xl flex border-b-2 border-black pb-4">
          <input type="email" placeholder="Your email address" className="bg-transparent flex-1 outline-none text-xl font-serif" />
          <button className="font-serif text-xl font-bold hover:italic transition-all uppercase tracking-widest">Subscribe</button>
        </div>
        <p className="mt-6 text-[10px] opacity-30 uppercase tracking-[0.2em]">* No spam, only inspiration.</p>
      </section>

      {/* 🚀 [7. Footer] 깔끔한 마무리 */}
      <footer className="py-12 border-t border-black/5 mx-auto flex justify-between items-center px-8" style={{ maxWidth: DESIGN_CONFIG.MAX_WIDTH }}>
        <div className="text-xs tracking-widest opacity-40 uppercase">© 2026 UNFRAME Inc. All Rights Reserved.</div>
        <div className="flex gap-8 text-[10px] tracking-widest uppercase font-bold opacity-60">
          <a href="#" className="hover:opacity-100">Instagram</a>
          <a href="#" className="hover:opacity-100">YouTube</a>
          <a href="#" className="hover:opacity-100">Privacy</a>
        </div>
      </footer>

      {/* 스타일 보조: 마키 애니메이션 정의 */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
}