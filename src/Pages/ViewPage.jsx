import "../styles/article-runtime.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { FontSize } from "../tiptap/extensions/FontSize";
import { LineHeight } from "../tiptap/extensions/LineHeight";
import { LetterSpacing } from "../tiptap/extensions/LetterSpacing";
import { UfDivider } from "../tiptap/nodes/UfDivider";
import { UfCallout } from "../tiptap/nodes/UfCallout";
import { UfFootnote } from "../tiptap/nodes/UfFootnote";
import { Superscript, Subscript, DropCap } from "../tiptap/extensions/TextExtras";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  runTransaction,
  getDoc,
  updateDoc,
  writeBatch,
  increment,
  where,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { trackEvent, trackEventOnce } from "../lib/trackEvent";
import { estimateReadMinutes, timeEmoji } from "../lib/readingMeta";
import { resolveProfileDisplayName } from "../lib/profileImage";

import { Scene } from "../tiptap/nodes/Scene";
import { UfImage } from "../tiptap/nodes/UfImage";
import { ResponsiveImage } from "../tiptap/nodes/ResponsiveImage";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";
import { StickyStory } from "../tiptap/nodes/StickyStory";
import { UfTable } from "../tiptap/nodes/UfTable";
import { Gallery } from "../tiptap/nodes/Gallery";
import { SlideGallery } from "../tiptap/nodes/SlideGallery";
import { UfPoll } from "../tiptap/nodes/UfPoll";
import { UfPlaylist } from "../tiptap/nodes/UfPlaylist";
import { UfPodcast } from "../tiptap/nodes/UfPodcast";
import { Columns, Column } from "../tiptap/nodes/Columns";
import ShareCardDialog from "../components/view/ShareCardDialog";

import { useArticleByEditionNo } from "../hooks/useArticleByEditionNo";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useRevealOnce } from "../hooks/useRevealOnce";
import { useLightboxFromArticleBody } from "../hooks/useLightboxFromArticleBody";
import { useParallaxRuntime } from "../hooks/useParallaxRuntime";
import { useSlideGalleryRuntime } from "../hooks/useSlideGalleryRuntime";
import { useSavedArticles } from "../hooks/useSavedArticles";

import ArticleHero from "../components/view/ArticleHero";
import RelatedArticles, { ParentArticleLink } from "../components/view/RelatedArticles";
import { useArticleRelations } from "../hooks/useArticleRelations";
import SideUtils from "../components/view/SideUtils";
import ArticleBody from "../components/view/ArticleBody";
import CommentSection from "../components/view/CommentSection";
import PrevNextCards from "../components/view/PrevNextCards";
import ArticleNav from "../components/view/ArticleNav";
import ImageLightbox from "../components/view/ImageLightbox";
import EditorInfoBox from "../components/view/EditorInfoBox";
import MoreFromEditor from "../components/view/MoreFromEditor";
import { isAdminEmail } from "../constants/admin";

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
  } catch {
    // Fall through to the textarea fallback.
  }
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
  } catch {
    // Clipboard support varies by browser and permission state.
  }
  return false;
}

export default function ViewPage({ isDarkMode, onToast, onLogin }) {
  const { id } = useParams();
  const nav = useNavigate();

  const bodyRef = useRef(null);

  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const [likedState, setLikedState] = useState({ key: "", value: false });
  const likePending = useRef(false);


  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: false,
    onCreate: ({ editor }) => {
      console.log(
        "[VIEW extensions]",
        editor.extensionManager.extensions.map((e) => e.name)
      );
    },
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
      LetterSpacing,
      LineHeight,
      Highlight.configure({
        multicolor: true,
      }),
      Superscript,
      Subscript,
      DropCap,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      UfTable.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Scene,
      Columns,
      Column,
      UfImage,
      ResponsiveImage,
      ParallaxImage,
      StickyStory,
      Gallery,
      SlideGallery,
      UfPoll,
      UfPlaylist,
      UfPodcast,
      UfDivider,
      UfCallout,
      UfFootnote,
    ],
    editorProps: {
      attributes: {
        class: "ProseMirror uf-prose uf-view max-w-none focus:outline-none min-h-[500px]",
      },
    },
  });

  const { loading, article } = useArticleByEditionNo({
    db,
    editionNo: id,
    editor,
  });
  const [articleAuthorProfile, setArticleAuthorProfile] = useState(null);

  const { progress, scrollToProgress } = useScrollProgress();
  const relations = useArticleRelations(article);
  const { lightbox, setLightbox } = useLightboxFromArticleBody(bodyRef, article?.id);

  useRevealOnce(bodyRef, [article]);
  useParallaxRuntime([article]);

  const { user, isSaved } = useSavedArticles();
  const saved = article?.editionNo ? isSaved(article.editionNo) : false;
  const isAdmin = isAdminEmail(user?.email);
  const isOwnerEditor =
    !!user?.email &&
    !!article?.authorEmail &&
    user.email === article.authorEmail;

  const canEditArticle = isAdmin || isOwnerEditor;
  useEffect(() => {
    let alive = true;
    const clearAuthorProfile = () => {
      queueMicrotask(() => {
        if (alive) setArticleAuthorProfile(null);
      });
    };

    const authorEmail = String(article?.authorEmail || "").trim();
    if (!authorEmail) {
      clearAuthorProfile();
      return () => {
        alive = false;
      };
    }

    const q = query(
      collection(db, "users"),
      where("email", "==", authorEmail),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setArticleAuthorProfile(null);
          return;
        }
        const d = snap.docs[0];
        setArticleAuthorProfile({ uid: d.id, ...d.data() });
      },
      (e) => {
        console.error("[ViewPage] author lookup error:", e);
        setArticleAuthorProfile(null);
      }
    );

    return () => {
      alive = false;
      unsub();
    };
  }, [article?.authorEmail]);

  const articleAuthorName =
    resolveProfileDisplayName(articleAuthorProfile, article) ||
    article?.author ||
    "Kim Jae Woo";

  const articleDocId = article?.docId || article?.firestoreId || article?.id || "";
  const likeKey = user?.uid && articleDocId ? `${articleDocId}:${user.uid}` : "";
  const liked = !!likeKey && likedState.key === likeKey && likedState.value;

  // Counts shown in the article info panel: loaded once, then nudged by this reader's own toggles.
  const [statDelta, setStatDelta] = useState({ key: "", likes: 0, saves: 0 });
  const delta = statDelta.key === articleDocId ? statDelta : { likes: 0, saves: 0 };
  const bumpStat = (name, amount) => setStatDelta((current) => {
    const base = current.key === articleDocId ? current : { key: articleDocId, likes: 0, saves: 0 };
    return { ...base, [name]: base[name] + amount };
  });
  const countOf = (value, amount) => (typeof value === "number" ? Math.max(0, value + amount) : null);
  const likeCount = countOf(article?.likes ?? 0, delta.likes);
  const saveCount = countOf(article?.saves, delta.saves);

  useEffect(() => {
    if (!likeKey) return;
    let alive = true;
    const [docId, uid] = likeKey.split(":");
    getDoc(doc(db, "articles", docId, "likes", uid))
      .then((snap) => {
        if (alive) setLikedState({ key: likeKey, value: snap.exists() });
      })
      .catch((e) => console.warn("[ViewPage] like state unavailable:", e?.message || e));
    return () => {
      alive = false;
    };
  }, [likeKey]);

  const readMinutes = useMemo(() => estimateReadMinutes(article), [article]);
  const readEmoji = useMemo(() => timeEmoji(readMinutes), [readMinutes]);

  useSlideGalleryRuntime(bodyRef, !loading && editor ? article?.id : null);

  useEffect(() => {
    if (!article?.editionNo) return;

    const editionNo = String(article.editionNo);
    const viewKey = `uf_viewed_${editionNo}`;

    try {
      if (sessionStorage.getItem(viewKey)) return;
      sessionStorage.setItem(viewKey, "1");
    } catch {
      // Reading an article must remain possible without browser storage.
    }

    trackEventOnce("view", `view_${editionNo}`, { editionNo }).catch((error) => {
      console.warn("[ViewPage] view tracking failed:", error);
    });

    const docId = article?.docId || article?.firestoreId || article?.id;
    if (!docId) return;

    updateDoc(doc(db, "articles", String(docId)), { views: increment(1) }).catch((e) => {
      console.warn("[ViewPage] views increment failed:", e?.message || e);
    });
  }, [article?.editionNo, article?.docId, article?.id, article?.firestoreId]);

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

    // The article's public save count moves with the reader's saved record (see firestore.rules).
    const articleRef = articleDocId && article?.status === "published" ? doc(db, "articles", String(articleDocId)) : null;

    if (before) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", uid, "saved", editionNo));
        // Saves made before the counter existed are not in it; never push it below zero.
        if (articleRef && Number(saveCount) > 0) batch.update(articleRef, { saves: increment(-1) });
        await batch.commit();
        bumpStat("saves", -1);
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
      let counted = false;

      await runTransaction(db, async (tx) => {
        const [savedSnap, flagSnap, userSnap, stickerSnap] = await Promise.all([
          tx.get(savedRef),
          tx.get(flagRef),
          tx.get(userRef),
          tx.get(stickerRef),
        ]);

        if (savedSnap.exists()) return;

        tx.set(savedRef, {
          editionNo,
          title: article?.title || null,
          coverMedium: article?.coverMedium || null,
          cover: article?.cover || null,
          category: article?.category || null,
          createdAt: serverTimestamp(),
        });
        if (articleRef) tx.update(articleRef, { saves: increment(1) });
        counted = true;

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

          if (!stickerSnap.exists()) {
            tx.set(stickerRef, { id: "first_save", createdAt: serverTimestamp() });
          }
        }
      });

      if (counted && articleRef) bumpStat("saves", 1);
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
    if (!article?.editionNo || !articleDocId) return;
    if (!user?.uid) {
      toast("좋아요는 로그인 후 가능해요.");
      return;
    }
    if (likePending.current) return;
    likePending.current = true;

    const editionNo = String(article.editionNo);
    const next = !liked;
    setLikedState({ key: likeKey, value: next });

    try {
      // The like record and the counter move together; rules reject one without the other.
      const batch = writeBatch(db);
      const likeRef = doc(db, "articles", String(articleDocId), "likes", user.uid);
      if (next) batch.set(likeRef, { createdAt: serverTimestamp() });
      else batch.delete(likeRef);
      batch.update(doc(db, "articles", String(articleDocId)), { likes: increment(next ? 1 : -1) });
      await batch.commit();
      bumpStat("likes", next ? 1 : -1);

      if (next) {
        trackEventOnce("like", `like_${editionNo}`, { editionNo }).catch((error) => {
          console.warn("[ViewPage] like tracking failed:", error);
        });
      }
    } catch (e) {
      console.warn("[ViewPage] like update failed:", e?.message || e);
      setLikedState({ key: likeKey, value: !next });
      toast("좋아요를 저장하지 못했어요.");
    } finally {
      likePending.current = false;
    }
  };

  const [shareRequest, setShareRequest] = useState(null);
  const openShare = (quote) => {
    if (!article?.editionNo) return;
    setShareRequest((current) => ({
      token: (current?.token || 0) + 1,
      quote: quote || article.excerpt || article.subtitle || "",
    }));
  };
  const onShareCard = () => {
    trackEventOnce("share", `share_${article.editionNo}`, { editionNo: String(article.editionNo) })
      .catch((e) => console.warn("[share] track failed:", e?.message || e));
  };

  const onShareLink = async () => {
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
      <div className="h-screen flex items-center justify-center font-black italic text-[var(--uf-muted)] animate-pulse uppercase tracking-widest">
        Archive Loading...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="h-screen flex items-center justify-center font-black italic text-[var(--uf-muted)] uppercase">
        404 Not Found
      </div>
    );
  }

  return (
    <div className="uf-page min-h-screen bg-[var(--uf-bg)] text-[var(--uf-text)] transition-colors duration-500">


      <div className="fixed top-[80px] left-0 w-full h-[3px] bg-zinc-200/70 dark:bg-zinc-800/80 z-90 backdrop-blur-sm">
        <div
          className="h-full bg-[#004aad] transition-all duration-150 shadow-[0_0_10px_#004aad]"
          style={{ width: `${clamp01(progress) * 100}%` }}
        />
      </div>

      <SideUtils
        progress={progress}
        onVerticalClick={handleVerticalClick}
        saved={saved}
        liked={liked}
        onToggleSave={onToggleSave}
        onToggleLike={onToggleLike}
        onShare={() => openShare()}
      />

      <ArticleHero
        article={article}
        authorName={articleAuthorName}
        readMinutes={readMinutes}
        readEmoji={readEmoji}
        onOpenImage={setLightbox}
        onShare={() => openShare()}
      />

      {canEditArticle && (
        <div className="max-w-[1200px] mx-auto px-6 mt-10">
          <Link
            to={`/edit/${article.id}`}
            className="inline-block text-[10px] font-black uppercase tracking-[0.4em] italic text-[#004aad] hover:opacity-70"
          >
            EDIT ARTICLE
          </Link>
        </div>
      )}

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-20">
        <ParentArticleLink parent={relations.parent} />
        <ArticleBody ref={bodyRef} article={article} editor={editor} onShareQuote={openShare} />

        <RelatedArticles parent={relations.parent} items={relations.items} />

        <EditorInfoBox
          article={article}
          currentUser={user}
          onToast={onToast}
          likeCount={likeCount}
          saveCount={saveCount}
        />

        <MoreFromEditor
          article={article}
          isDarkMode={isDarkMode}
        />

        <CommentSection article={article} onLogin={onLogin} />

        <PrevNextCards currentArticle={article} />

        <ArticleNav article={article} nav={nav} />
      </main>

      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
      {shareRequest ? (
        <ShareCardDialog
          key={shareRequest.token}
          article={article}
          initialQuote={shareRequest.quote}
          onClose={() => setShareRequest(null)}
          onShareLink={onShareLink}
          onShared={onShareCard}
          onToast={toast}
        />
      ) : null}
    </div>
  );
}
