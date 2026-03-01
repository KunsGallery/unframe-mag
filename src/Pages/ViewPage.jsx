import React, { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";

import { db } from "../firebase/config";

import { Scene } from "../tiptap/nodes/Scene";
import { UfImage } from "../tiptap/nodes/UfImage";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";
import { StickyStory } from "../tiptap/nodes/StickyStory";
import { Gallery } from "../tiptap/nodes/Gallery";
import { UfPoll } from "../tiptap/nodes/UfPoll";

import { useArticleByEditionNo } from "../hooks/useArticleByEditionNo";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useRevealOnce } from "../hooks/useRevealOnce";
import { useLightboxFromArticleBody } from "../hooks/useLightboxFromArticleBody";
import { useParallaxRuntime } from "../hooks/useParallaxRuntime";
import { useSavedArticles } from "../hooks/useSavedArticles";

import ArticleHero from "../components/view/ArticleHero";
import SideUtils from "../components/view/SideUtils";
import ArticleBody from "../components/view/ArticleBody";
import CommentSection from "../components/view/CommentSection";
import PrevNextCards from "../components/view/PrevNextCards";
import ArticleNav from "../components/view/ArticleNav";
import Lightbox from "../components/view/Lightbox";

export default function ViewPage({ onToast }) {
  const { id } = useParams(); // editionNo
  const nav = useNavigate();

  const bodyRef = useRef(null);

  const [isLiked, setIsLiked] = useState(false);

  const toast = (m) => (onToast ? onToast(m) : console.log(m));

  // ✅ ViewPage에서만 StickyStory가 확실히 동작하도록 CSS를 강제 주입
  const viewRuntimeCSS = useMemo(
    () => `
/* ---- View Runtime (scoped) ---- */
.uf-prose { overflow: visible !important; } /* sticky 깨짐 방지용 */

/* StickyStory: 블록 끝날 때까지 이미지는 고정(sticky), 끝나면 같이 올라감 */
.uf-prose [data-uf="sticky-story"]{
  min-height: var(--uf-sticky-height, 220vh);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

/* 핵심: sticky */
.uf-prose .uf-sticky-story__visual{
  position: sticky;
  top: 84px;                 /* 헤더 높이에 맞게 숫자만 조절 */
  height: calc(100vh - 110px);
  border-radius: 16px;
  overflow: hidden;
  background: #111;
}

/* 이미지 꽉 채우기 */
.uf-prose .uf-sticky-story__visual img{
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 텍스트 영역 */
.uf-prose .uf-sticky-story__content{
  padding: 8px 0 64px;
}

/* 좌/우 반전 */
.uf-prose [data-uf="sticky-story"].is-right .uf-sticky-story__visual{ order: 2; }
.uf-prose [data-uf="sticky-story"].is-right .uf-sticky-story__content{ order: 1; }

/* 모바일: 스택 + sticky 해제 */
@media (max-width: 860px){
  .uf-prose [data-uf="sticky-story"]{
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .uf-prose .uf-sticky-story__visual{
    position: relative;
    top: auto;
    height: 56vh;
  }
}
`,
    []
  );

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Scene,
      UfImage,
      ParallaxImage,
      StickyStory,
      Gallery,
      UfPoll,
    ],
    editorProps: {
      attributes: {
        class: "ProseMirror uf-prose uf-view focus:outline-none min-h-[500px]",
      },
    },
  });

  const { loading, article } = useArticleByEditionNo({
    db,
    editionNo: id,
    editor,
  });

  const { progress, scrollToProgress } = useScrollProgress();
  const { lightbox, setLightbox } = useLightboxFromArticleBody(bodyRef);

  useRevealOnce(bodyRef, [article]);
  useParallaxRuntime([article]);

  // ✅ 저장 기능
  const { user, isSaved, toggleSave } = useSavedArticles();
  const saved = article?.editionNo ? isSaved(article.editionNo) : false;

  const onToggleSave = async () => {
    if (!article?.editionNo) return;
    try {
      await toggleSave(article.editionNo, article);
    } catch (e) {
      console.error(e);
      toast("저장은 로그인 후 가능해요.");
    }
  };

  const handleVerticalClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percent = clickY / rect.height;
    scrollToProgress(percent);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-black italic text-zinc-300 animate-pulse uppercase tracking-widest">
        Archive Loading...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="h-screen flex items-center justify-center font-black italic text-zinc-300 uppercase">
        404 Not Found
      </div>
    );
  }

  return (
    <div className="uf-page bg-[#fcfcfc] dark:bg-zinc-950 min-h-screen transition-colors duration-500">
      {/* ✅ View Runtime CSS 주입 */}
      <style>{viewRuntimeCSS}</style>

      {/* TOP PROGRESS BAR */}
      <div className="fixed top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800 z-50">
        <div
          className="h-full bg-[#004aad] transition-all duration-150 shadow-[0_0_10px_#004aad]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <SideUtils
        progress={progress}
        onVerticalClick={handleVerticalClick}
        // ✅ SideUtils는 깨질 수 있으니 기존 like만 유지
        isLiked={isLiked}
        setIsLiked={setIsLiked}
      />

      {/* ✅ SAVE 버튼(고정) */}
      <button
        onClick={onToggleSave}
        className={[
          "fixed right-6 bottom-6 z-50",
          "px-5 py-4 rounded-2xl shadow-xl border",
          "font-black italic text-xs tracking-[0.35em] uppercase transition",
          saved
            ? "bg-[#004aad] text-white border-[#004aad]"
            : "bg-white/90 dark:bg-zinc-950/80 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800",
        ].join(" ")}
        title={user ? (saved ? "Unsave" : "Save") : "Login required"}
      >
        {saved ? "SAVED" : "SAVE"}
      </button>

      <ArticleHero article={article} />

      {/* ✅ main에서 overflow를 건드리지 않음 (sticky 깨짐 방지) */}
      <main className="max-w-[1200px] mx-auto px-6 pb-20">
        <ArticleBody ref={bodyRef} article={article} editor={editor} />

        <CommentSection article={article} />

        <PrevNextCards currentArticle={article} />

        <ArticleNav article={article} nav={nav} />
      </main>

      <Lightbox lightbox={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}