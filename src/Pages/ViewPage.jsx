import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Heart, Share2, Bookmark, ArrowUp, X, MessageSquare } from "lucide-react";

// --- Firebase ---
import { db } from "../firebase/config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

// --- 커스텀 Tiptap Nodes (우리가 이전에 만든 파일들) ---
import { Scene } from "../tiptap/nodes/Scene";
import { UfImage } from "../tiptap/nodes/UfImage";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";
import { StickyStory } from "../tiptap/nodes/StickyStory";

export default function ViewPage() {
  const { id } = useParams(); // URL의 editionNo (예: 082)
  const nav = useNavigate();
  const bodyRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);
  const [progress, setProgress] = useState(0); 
  const [lightbox, setLightbox] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // 1. 에디터 설정 (Read-only 및 커스텀 노드 등록)
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit, 
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Scene,        // 👈 장면 블록 기능 활성화
      UfImage,      // 👈 이미지 캡션 기능 활성화
      ParallaxImage, // 👈 패럴랙스 애니메이션 활성화
      StickyStory    // 👈 스티키 스토리 레이아웃 활성화
    ],
    editorProps: {
      attributes: { 
        class: "ProseMirror uf-prose view-mode uf-prose--kinfolk focus:outline-none min-h-[500px]" 
      },
    },
  });

  // 2. Firebase 실시간 데이터 로딩
  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "articles"), where("editionNo", "==", id), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setArticle(data);
          // 팁탭 엔진에 데이터 주입
          if (editor && data.contentHTML) {
            editor.commands.setContent(data.contentHTML);
          }
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (editor) fetchArticle();
  }, [id, editor]);

  // 3. 스크롤 프로그레스 & Reveal 애니메이션
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollTop / (maxScroll || 1));
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    window.addEventListener("scroll", handleScroll);
    
    // 팁탭 렌더링 후 reveal 타겟 설정
    const revealEls = bodyRef.current?.querySelectorAll("p, h2, h3, figure, section");
    revealEls?.forEach(el => {
      el.classList.add("uf-reveal");
      io.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      io.disconnect();
    };
  }, [article, editor]);

  // 4. 인터랙션 핸들러 (수직바 클릭 이동)
  const handleVerticalClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percent = clickY / rect.height;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: percent * maxScroll, behavior: "smooth" });
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-zinc-300 animate-pulse uppercase tracking-widest">Archive Loading...</div>;
  if (!article) return <div className="h-screen flex items-center justify-center font-black italic text-zinc-300 uppercase">404 Not Found</div>;

  return (
    <div className="uf-page bg-[#fcfcfc] dark:bg-zinc-950 min-h-screen transition-colors duration-500 overflow-x-hidden">
      
      {/* --- TOP PROGRESS BAR --- */}
      <div className="fixed top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800 z-[100]">
        <div className="h-full bg-[#004aad] transition-all duration-150 shadow-[0_0_10px_#004aad]" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* --- SIDE GLASS UTILS --- */}
      <aside className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col items-center gap-4">
        <button onClick={() => setSaved(!saved)} className={`w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center transition-all ${saved ? 'bg-[#004aad] text-white shadow-blue-500/50' : 'bg-white/40 text-zinc-400 hover:text-black'}`}>
          <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
        </button>
        <button onClick={() => setIsLiked(!isLiked)} className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all">
          <Heart size={20} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-red-500" : ""} />
        </button>
        <button className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center text-zinc-400 hover:text-black transition-all">
          <Share2 size={20} />
        </button>

        {/* --- VERTICAL CLICKABLE PROGRESS BAR --- */}
        <div className="relative w-1.5 h-32 bg-zinc-200 dark:bg-zinc-800 rounded-full my-4 cursor-pointer group" onClick={handleVerticalClick}>
          <div className="absolute top-0 left-0 w-full bg-[#004aad] rounded-full transition-all duration-150" style={{ height: `${progress * 100}%` }} />
          <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#004aad] rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white pointer-events-none" style={{ top: `calc(${progress * 100}% - 8px)` }} />
        </div>

        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-zinc-300 hover:text-[#004aad] transition-all">
          <ArrowUp size={20} />
        </button>
      </aside>

      {/* --- HERO --- */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 scale-105">
          <img src={article.coverMedium || article.cover} className="w-full h-full object-cover opacity-40 dark:opacity-20 blur-[2px]" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#fcfcfc]/50 to-[#fcfcfc] dark:via-zinc-950/50 dark:to-zinc-950" />
        </div>
        <div className="relative z-10 text-center max-w-4xl px-6">
          <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#004aad] mb-8 block bg-[#004aad]/10 inline-block px-4 py-1 rounded">{article.category}</span>
          <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none dark:text-white break-keep drop-shadow-sm">{article.title}</h1>
          <div className="mt-12 flex items-center justify-center gap-8 text-xs font-bold tracking-widest text-zinc-400 uppercase italic">
            <span>By {article.author || "Kim Jae Woo"}</span>
            <div className="w-1 h-1 bg-zinc-300 rounded-full" />
            <span>Archive No.{article.editionNo}</span>
          </div>
        </div>
      </section>

      {/* --- MAIN BODY --- */}
      <main className="max-w-[1200px] mx-auto px-6 pb-20">
        <div ref={bodyRef} className="uf-article-content relative">
          {/* 아티클 요약문 (에디터 본문 시작 전 강조) */}
          <div className="max-w-[760px] mx-auto mb-20">
             <p className="text-3xl md:text-4xl font-black italic text-[#004aad] leading-tight border-l-[12px] border-[#004aad] pl-12 py-4">"{article.excerpt}"</p>
          </div>
          
          {/* 실제 팁탭 내용 렌더링 */}
          <EditorContent editor={editor} />
        </div>

        {/* --- COMMENT SECTION --- */}
        <section className="max-w-[760px] mx-auto mt-40 pt-20 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-10 text-[#004aad]">
            <MessageSquare size={22} />
            <h4 className="text-xl font-black italic tracking-tighter">COMMENTS</h4>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[32px] p-8 border border-zinc-100 dark:border-zinc-800 shadow-inner">
            <textarea className="w-full bg-transparent outline-none text-sm resize-none h-24 mb-4 dark:text-zinc-300" placeholder="기록에 대한 당신의 관점을 들려주세요." />
            <div className="flex justify-end">
              <button className="px-8 py-3 bg-[#004aad] text-white text-[11px] font-black tracking-[0.2em] rounded-full hover:bg-black transition-all shadow-xl shadow-blue-500/20">POST COMMENT</button>
            </div>
          </div>
        </section>

        {/* --- ARTICLE NAV (이전/다음 글) --- */}
        <nav className="max-w-[760px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mt-20">
          {article.prev && (
            <button onClick={() => nav(`/article/${article.prev.id}`)} className="group relative h-44 rounded-[32px] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:-translate-y-1">
              <img src={article.prev.cover} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000" alt="" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#fcfcfc] dark:from-zinc-950 p-10 flex flex-col justify-center">
                <span className="text-[10px] font-black text-[#004aad] mb-2 uppercase tracking-widest italic">Previous</span>
                <h4 className="text-lg font-black italic leading-tight dark:text-white line-clamp-2">{article.prev.title}</h4>
              </div>
            </button>
          )}
          {article.next && (
            <button onClick={() => nav(`/article/${article.next.id}`)} className="group relative h-44 rounded-[32px] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:-translate-y-1">
              <img src={article.next.cover} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000" alt="" />
              <div className="absolute inset-0 bg-gradient-to-l from-[#fcfcfc] dark:from-zinc-950 p-10 flex flex-col justify-center text-right">
                <span className="text-[10px] font-black text-[#004aad] mb-2 uppercase tracking-widest italic">Next</span>
                <h4 className="text-lg font-black italic leading-tight dark:text-white line-clamp-2">{article.next.title}</h4>
              </div>
            </button>
          )}
        </nav>
      </main>

      {/* --- SINGLE LIGHTBOX --- */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <button className="absolute top-10 right-10 text-white opacity-50 hover:opacity-100 hover:rotate-90 transition-all"><X size={32}/></button>
          <img src={lightbox.src} className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300" alt="" />
          {lightbox.caption && <p className="mt-10 text-white/60 font-medium italic tracking-widest text-sm">{lightbox.caption}</p>}
        </div>
      )}
    </div>
  );
}