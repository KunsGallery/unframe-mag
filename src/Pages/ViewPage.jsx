import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { doc, serverTimestamp, runTransaction, deleteDoc } from "firebase/firestore";

import { db } from "../firebase/config";
import { trackEvent, trackEventOnce } from "../lib/trackEvent";

import { Scene } from "../tiptap/nodes/Scene";
import { UfImage } from "../tiptap/nodes/UfImage";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";
import { StickyStory } from "../tiptap/nodes/StickyStory";
import { Gallery } from "../tiptap/nodes/Gallery";
import { UfPoll } from "../tiptap/nodes/UfPoll";
import { UfPlaylist } from "../tiptap/nodes/UfPlaylist";
import { UfPodcast } from "../tiptap/nodes/UfPodcast";

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

function clamp01(v) {
  const n = Number(v || 0);
  return Math.max(0, Math.min(1, n));
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  // fallback
  try {
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.left = "-9999px";
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
    return true;
  } catch {}
  return false;
}

export default function ViewPage({ onToast }) {
  const { id } = useParams(); // editionNo
  const nav = useNavigate();

  const bodyRef = useRef(null);

  const toast = (m) => (onToast ? onToast(m) : console.log(m));

  // Like UI state(“중복 증가 방지”는 localStorage로 처리)
  const [liked, setLiked] = useState(false);

  // ✅ ViewPage에서만 StickyStory가 확실히 동작하도록 CSS를 강제 주입
  const viewRuntimeCSS = useMemo(
    () => `
/* ---- View Runtime (scoped) ---- */
.uf-prose { overflow: visible !important; }

/* StickyStory */
.uf-prose [data-uf="sticky-story"]{
  min-height: var(--uf-sticky-height, 220vh);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

.uf-prose .uf-sticky-story__visual{
  position: sticky;
  top: 84px;
  height: calc(100vh - 110px);
  border-radius: 16px;
  overflow: hidden;
  background: #111;
}

.uf-prose .uf-sticky-story__visual img{
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uf-prose .uf-sticky-story__content{
  padding: 8px 0 64px;
}

.uf-prose [data-uf="sticky-story"].is-right .uf-sticky-story__visual{ order: 2; }
.uf-prose [data-uf="sticky-story"].is-right .uf-sticky-story__content{ order: 1; }

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
      UfPlaylist,
      UfPodcast,
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

  // ---------------------------------------
  // 1) 조회수 + trackEvent("view") (세션 1회)
  // ---------------------------------------
  useEffect(() => {
    if (!article?.docId && !article?.id) {
      // docId가 어디에 있는지 모를 수 있어서 가드만
    }
    if (!article?.editionNo) return;

    const editionNo = String(article.editionNo);
    const viewKey = `uf_viewed_${editionNo}`;

    // 세션(탭 살아있는 동안) 1회만
    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");

    // (A) 트래킹
    trackEventOnce("view", `view_${editionNo}`, { editionNo });

    // (B) Firestore views +1 (rules: published 글 likes/views 증가 허용)
    // docId가 실제 firestore 문서ID여야 함.
    const docId = article?.docId || article?.firestoreId || article?.id;
    if (!docId) return;

    updateDoc(doc(db, "articles", String(docId)), { views: increment(1) }).catch((e) => {
      // 권한/필드 누락 등은 치명적이지 않으니 조용히
      console.warn("[ViewPage] views increment failed:", e?.message || e);
    });
  }, [article?.editionNo, article?.docId, article?.id, article?.firestoreId]);

  // ---------------------------------------
  // 2) Like 초기 상태(로컬) 세팅
  // ---------------------------------------
  useEffect(() => {
    if (!article?.editionNo) return;
    const editionNo = String(article.editionNo);
    const who = user?.uid || "anon";
    const likeKey = `uf_liked_${editionNo}_${who}`;
    setLiked(localStorage.getItem(likeKey) === "1");
  }, [article?.editionNo, user?.uid]);

  // ---------------------------------------
  // SideUtils handlers
  // ---------------------------------------
  const handleVerticalClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percent = clickY / rect.height;
    scrollToProgress(percent);
  };

  const onToggleSave = async () => {
    if (!article?.editionNo) return;

    const editionNo = String(article.editionNo);
    const before = isSaved(editionNo);

    if (!user?.uid) {
      toast("저장은 로그인 후 가능해요.");
      return;
    }

    const uid = user.uid;

    // ✅ 해제는 단순 delete (XP/카운트는 안 깎음)
    if (before) {
      try {
        await deleteDoc(doc(db, "users", uid, "saved", editionNo));
        toast("저장 해제됨");
      } catch (e) {
        console.error(e);
        toast(`저장 해제 실패: ${e?.message || e}`);
     }
      return;
    }

    try {
      const savedRef = doc(db, "users", uid, "saved", editionNo);
      const flagRef = doc(db, "users", uid, "xpFlags", `save_${editionNo}`);
      const userRef = doc(db, "users", uid);
      const stickerRef = doc(db, "users", uid, "stickers", "first_save");

      let nextUnique = null;

      await runTransaction(db, async (tx) => {
        const [savedSnap, flagSnap, userSnap, stickerSnap] = await Promise.all([
          tx.get(savedRef),
          tx.get(flagRef),
          tx.get(userRef),
          tx.get(stickerRef),
        ]);

        // 이미 저장되어 있으면 종료
        if (savedSnap.exists()) return;

        // 1) saved 생성
        tx.set(savedRef, {
          editionNo,
          title: article?.title || null,
          coverMedium: article?.coverMedium || null,
          cover: article?.cover || null,
          category: article?.category || null,
          createdAt: serverTimestamp(),
        });

        // 2) 유니크 플래그/카운트는 flag가 없을 때만
        if (!flagSnap.exists()) {
          const prev = userSnap.exists() ? Number(userSnap.data().saveUniqueCount || 0) : 0;
          nextUnique = prev + 1;

          tx.set(flagRef, {
            type: "save",
            editionNo,
            createdAt: serverTimestamp(),
          });

          tx.set(
            userRef,
            {
              saveUniqueCount: nextUnique,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // 3) 업적(10/50/100) — rules에 본인 create 허용되어 있어야 함
          if (nextUnique === 10 || nextUnique === 50 || nextUnique === 100) {
            const achId =
              nextUnique === 10 ? "save_10" : nextUnique === 50 ? "save_50" : "save_100";
            const achRef = doc(db, "users", uid, "achievements", achId);
            tx.set(
              achRef,
              { id: achId, kind: "save_unique", value: nextUnique, createdAt: serverTimestamp() },
              { merge: true }
            );
          }

          // ✅ 4) first_save 스티커는 “없을 때만” 생성 (존재하면 update 금지라 건드리지 않음)
          if (!stickerSnap.exists()) {
            tx.set(stickerRef, { id: "first_save", createdAt: serverTimestamp() });
          }
        }
      });

      // ✅ XP 지급 (유니크 저장일 때만)
      if (typeof nextUnique === "number") {
        trackEvent("save", { editionNo, saveUniqueCount: nextUnique });
        toast(`저장 완료! (유니크 저장 ${nextUnique})`);
      } else {
        trackEvent("save", { editionNo }, { xp: 0 });
        toast("저장 완료!");
      }
    } catch (e) {
      console.error(e);
      toast(`저장 실패: ${e?.message || e}`);
    }
  };

  const onToggleLike = async () => {
    if (!article?.editionNo) return;

    const editionNo = String(article.editionNo);
    const who = user?.uid || "anon";
    const likeKey = `uf_liked_${editionNo}_${who}`;

    // 이미 like 처리한 사람은 증가/트래킹을 다시 하지 않음
    const already = localStorage.getItem(likeKey) === "1";

    if (!already) {
      localStorage.setItem(likeKey, "1");
      setLiked(true);

      // (A) 트래킹
      trackEvent("like", { editionNo });

      // (B) Firestore likes +1
      const docId = article?.docId || article?.firestoreId || article?.id;
      if (docId) {
        updateDoc(doc(db, "articles", String(docId)), { likes: increment(1) }).catch((e) => {
          console.warn("[ViewPage] likes increment failed:", e?.message || e);
        });
      }
      return;
    }

    // 이미 눌렀던 경우: UI만 토글(“되돌리기” 느낌) — 감소는 하지 않음(규칙/악용 방지)
    setLiked((v) => !v);
  };

  const onShare = async () => {
    if (!article?.editionNo) return;

    const url = window.location.href;
    const title = article?.title || "U# Article";
    const editionNo = String(article.editionNo);

    try {
      if (navigator.share) {
        await navigator.share({ title, url });

        await trackEventOnce("share", `share_${editionNo}`, {
          editionNo,
        });
        return;
      }

      const ok = await copyToClipboard(url);
      if (!ok) {
        toast("복사에 실패했어요.");
        return;
      }

      toast("링크를 복사했어요.");

      await trackEventOnce("share", `share_${editionNo}`, {
        editionNo,
      });
    } catch (e) {
      const msg = String(e?.message || "");
      const name = String(e?.name || "");

      if (
        name === "AbortError" ||
        name === "NotAllowedError" ||
        msg.toLowerCase().includes("canceled") ||
        msg.toLowerCase().includes("cancelled")
      ) {
        return;
      }

      console.warn("[share] failed:", e?.message || e);
      toast("공유에 실패했어요.");
    }
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
      <style>{viewRuntimeCSS}</style>

      {/* TOP PROGRESS BAR */}
      <div className="fixed top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800 z-50">
        <div
          className="h-full bg-[#004aad] transition-all duration-150 shadow-[0_0_10px_#004aad]"
          style={{ width: `${clamp01(progress) * 100}%` }}
        />
      </div>

      {/* ✅ Side Utils (save/like/share 연결 완료) */}
      <SideUtils
        progress={progress}
        onVerticalClick={handleVerticalClick}
        saved={saved}
        liked={liked}
        onToggleSave={onToggleSave}
        onToggleLike={onToggleLike}
        onShare={onShare}
      />

      <ArticleHero article={article} />

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