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
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { FontSize } from "../tiptap/extensions/FontSize";
import { LineHeight } from "../tiptap/extensions/LineHeight";
import { LetterSpacing } from "../tiptap/extensions/LetterSpacing";
import { UfDivider } from "../tiptap/nodes/UfDivider";
import { UfCallout } from "../tiptap/nodes/UfCallout";
import {
  doc,
  serverTimestamp,
  runTransaction,
  deleteDoc,
  updateDoc,
  increment,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { trackEvent, trackEventOnce } from "../lib/trackEvent";
import { estimateReadMinutes, timeEmoji } from "../lib/readingMeta";

import { Scene } from "../tiptap/nodes/Scene";
import { UfImage } from "../tiptap/nodes/UfImage";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";
import { StickyStory } from "../tiptap/nodes/StickyStory";
import { Gallery } from "../tiptap/nodes/Gallery";
import { SlideGallery } from "../tiptap/nodes/SlideGallery";
import { UfPoll } from "../tiptap/nodes/UfPoll";
import { UfPlaylist } from "../tiptap/nodes/UfPlaylist";
import { UfPodcast } from "../tiptap/nodes/UfPodcast";
import { Columns, Column } from "../tiptap/nodes/Columns";

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
import EditorInfoBox from "../components/view/EditorInfoBox";
import MoreFromEditor from "../components/view/MoreFromEditor";

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

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

export default function ViewPage({ isDarkMode, onToast }) {
  const { id } = useParams();
  const nav = useNavigate();

  const bodyRef = useRef(null);

  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const [liked, setLiked] = useState(false);

  const viewRuntimeCSS = useMemo(
    () => `
/* ---- View Runtime (scoped) ---- */
.uf-prose { 
  overflow: visible !important;
  color: inherit;
  font-style: normal;
  font-weight: 300;
  font-size: 18px;
  line-height: 1.95;
  letter-spacing: 0.01em;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.uf-prose p{
  margin: 0 0 1.6em;
}

.uf-prose h1,
.uf-prose h2,
.uf-prose h3{
  font-style: italic;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin: 1.2em 0 0.5em;
}

.uf-prose h1{ font-size: 3.4rem; }
.uf-prose h2{ font-size: 2.4rem; }
.uf-prose h3{ font-size: 1.7rem; }

.uf-prose blockquote{
  margin: 2em 0;
  padding-left: 1.25em;
  border-left: 4px solid #004aad;
  font-style: italic;
}

.uf-prose ul,
.uf-prose ol{
  margin: 0 0 1.6em 1.25em;
  padding-left: 1.1em;
}

.uf-prose li{
  margin: 0.35em 0;
}

.uf-prose hr{
  margin: 3em 0;
  border: 0;
  border-top: 1px solid rgba(113,113,122,.25);
}

.uf-prose img{
  display: block;
  max-width: 100%;
  height: auto;
}

/* Columns */
.uf-prose .uf-columns {
  display: grid;
  grid-template-columns: repeat(var(--uf-columns-count, 2), minmax(0, 1fr));
  gap: var(--uf-columns-gap, 24px);
  margin: 2.2rem 0;
  align-items: start;
}

.uf-prose .uf-columns[data-columns="2"] {
  --uf-columns-count: 2;
}

.uf-prose .uf-columns[data-columns="3"] {
  --uf-columns-count: 3;
}

.uf-prose .uf-columns[data-valign="center"] {
  align-items: center;
}

.uf-prose .uf-column {
  min-width: 0;
}

.uf-prose .uf-column > :first-child {
  margin-top: 0;
}

.uf-prose .uf-column > :last-child {
  margin-bottom: 0;
}

/* Table */
.uf-prose .tableWrapper{
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 2rem 0;
  border-radius: 16px;
  -webkit-overflow-scrolling: touch;
}

.uf-prose table{
  width: max-content;
  min-width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0;
  background: white;
}

.dark .uf-prose table{
  background: rgba(24,24,27,.82);
}

.uf-prose th,
.uf-prose td{
  min-width: 140px;
  padding: 12px 14px;
  border: 1px solid rgba(0,0,0,.06);
  vertical-align: top;
  overflow-wrap: break-word;
  word-break: break-word;
  box-sizing: border-box;
  overflow: hidden;
}

.dark .uf-prose th,
.dark .uf-prose td{
  border-color: rgba(255,255,255,.08);
}

.uf-prose th{
  background: rgba(0,0,0,.04);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 11px;
}

.dark .uf-prose th{
  background: rgba(255,255,255,.05);
}

.uf-prose td{
  font-size: 14px;
}

.uf-prose td p,
.uf-prose th p{
  margin: 0;
}

.uf-prose td img,
.uf-prose th img{
  display: block;
  width: 100% !important;
  max-width: none;
  height: auto !important;
  object-fit: cover;
  border-radius: 10px;
}

.uf-prose pre{
  margin: 1.8em 0;
  padding: 1.1em 1.2em;
  border-radius: 16px;
  overflow-x: auto;
}

.uf-prose :last-child{
  margin-bottom: 0;
}

.uf-prose .uf-divider{
  width: 100%;
  margin: 3em 0;
  position: relative;
}

.uf-prose .uf-divider.is-line{
  height: 1px;
  background: rgba(113,113,122,.25);
}

.uf-prose .uf-divider.is-dashed{
  height: 0;
  border-top: 1px dashed rgba(113,113,122,.35);
}

.uf-prose .uf-divider.is-double{
  height: 8px;
  border-top: 1px solid rgba(113,113,122,.28);
  border-bottom: 1px solid rgba(113,113,122,.28);
}

.uf-prose .uf-divider.is-dots{
  height: 10px;
  background:
    radial-gradient(circle, rgba(113,113,122,.45) 1.5px, transparent 1.7px)
    center / 14px 10px repeat-x;
}

.uf-prose .uf-divider.is-fade{
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(113,113,122,.38), transparent);
}

.uf-prose .uf-divider.is-glow{
  height: 2px;
  background: linear-gradient(90deg, transparent, #004aad, transparent);
  box-shadow: 0 0 18px rgba(0,74,173,.35);
}

.uf-prose .uf-divider.is-space{
  height: 48px;
}

.uf-prose .uf-callout{
  margin: 2.2em 0;
  padding: 1.2em 1.2em 1.15em;
  border: 1px solid rgba(113,113,122,.18);
  border-radius: 22px;
  background: rgba(255,255,255,.55);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
}

.dark .uf-prose .uf-callout{
  background: rgba(24,24,27,.62);
  border-color: rgba(255,255,255,.08);
}

.uf-prose .uf-callout::before{
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: rgba(0,74,173,.7);
}

.uf-prose .uf-callout__label{
  margin-bottom: .8em;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .28em;
  text-transform: uppercase;
  color: #004aad;
}

.uf-prose .uf-callout__body > :last-child{
  margin-bottom: 0;
}

.uf-prose .uf-callout.is-note{
  background: rgba(255,255,255,.58);
  border-color: rgba(113,113,122,.16);
}
.dark .uf-prose .uf-callout.is-note{
  background: rgba(24,24,27,.62);
}
.uf-prose .uf-callout.is-note::before{
  background: rgba(0,74,173,.72);
}
.uf-prose .uf-callout.is-note .uf-callout__label{
  color: #004aad;
}

.uf-prose .uf-callout.is-point{
  background: linear-gradient(180deg, rgba(0,74,173,.08), rgba(255,255,255,.7));
  border-color: rgba(0,74,173,.24);
  box-shadow: 0 10px 30px rgba(0,74,173,.08);
}
.dark .uf-prose .uf-callout.is-point{
  background: linear-gradient(180deg, rgba(0,74,173,.18), rgba(24,24,27,.72));
  border-color: rgba(0,74,173,.24);
}
.uf-prose .uf-callout.is-point::before{
  background: #004aad;
}
.uf-prose .uf-callout.is-point .uf-callout__label{
  color: #004aad;
}

.uf-prose .uf-callout.is-info{
  background: linear-gradient(180deg, rgba(16,185,129,.06), rgba(255,255,255,.68));
  border-color: rgba(16,185,129,.24);
}
.dark .uf-prose .uf-callout.is-info{
  background: linear-gradient(180deg, rgba(16,185,129,.12), rgba(24,24,27,.72));
  border-color: rgba(16,185,129,.22);
}
.uf-prose .uf-callout.is-info::before{
  background: rgba(16,185,129,.85);
}
.uf-prose .uf-callout.is-info .uf-callout__label{
  color: rgba(5,150,105,1);
}

.uf-prose .uf-callout.is-quote{
  background: rgba(244,244,245,.72);
  border-color: rgba(113,113,122,.18);
}
.dark .uf-prose .uf-callout.is-quote{
  background: rgba(39,39,42,.82);
}
.uf-prose .uf-callout.is-quote::before{
  background: rgba(161,161,170,.9);
}
.uf-prose .uf-callout.is-quote .uf-callout__label{
  color: rgba(113,113,122,1);
}
.uf-prose .uf-callout.is-quote .uf-callout__body{
  font-style: italic;
}

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

/* Slide Gallery */
.uf-prose .uf-slide-gallery {
  margin: 3rem 0;
}

.uf-prose .uf-slide-gallery__viewport {
  position: relative;
}

.uf-prose .uf-slide-gallery__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  scroll-behavior: smooth;
}

.uf-prose .uf-slide-gallery__track::-webkit-scrollbar {
  display: none;
}

.uf-prose .uf-slide-gallery__slide {
  scroll-snap-align: start;
  margin: 0;
}

.uf-prose .uf-slide-gallery__track[data-ratio="16/9"] .uf-slide-gallery__img {
  aspect-ratio: 16 / 9;
}

.uf-prose .uf-slide-gallery__track[data-ratio="4/3"] .uf-slide-gallery__img {
  aspect-ratio: 4 / 3;
}

.uf-prose .uf-slide-gallery__track[data-ratio="1/1"] .uf-slide-gallery__img {
  aspect-ratio: 1 / 1;
}

.uf-prose .uf-slide-gallery__track[data-ratio="3/4"] .uf-slide-gallery__img {
  aspect-ratio: 3 / 4;
}

.uf-prose .uf-slide-gallery__img {
  width: 100%;
  display: block;
  object-fit: cover;
  border-radius: var(--uf-slide-radius, 20px);
}

.uf-prose .uf-slide-gallery__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  color: white;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 24px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .18s ease, opacity .18s ease, transform .18s ease;
  opacity: .8;
}

.uf-prose .uf-slide-gallery__arrow:hover {
  background: rgba(0, 0, 0, 0.34);
  opacity: 1;
}

.uf-prose .uf-slide-gallery__arrow--prev {
  left: 10px;
}

.uf-prose .uf-slide-gallery__arrow--next {
  right: 10px;
}

.uf-prose .uf-slide-gallery__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.uf-prose .uf-slide-gallery__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: 0;
  background: rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: all .18s ease;
  padding: 0;
}

.dark .uf-prose .uf-slide-gallery__dot {
  background: rgba(255, 255, 255, 0.22);
}

.uf-prose .uf-slide-gallery__dot[data-active="true"] {
  width: 18px;
  background: rgba(0, 74, 173, 0.95);
}

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

@media (max-width: 768px){
  .uf-prose{
    font-size: 16px;
    line-height: 1.82;
    letter-spacing: 0;
  }

  .uf-prose p{
    margin: 0 0 1.35em;
  }

  .uf-prose h1{ font-size: 2.1rem; }
  .uf-prose h2{ font-size: 1.6rem; }
  .uf-prose h3{ font-size: 1.28rem; }

  .uf-prose blockquote{
    margin: 1.4em 0;
    padding-left: 1em;
  }

  .uf-prose .uf-img{
    margin: 1.8rem auto;
  }

  .uf-prose .uf-gallery{
    margin: 2rem 0;
  }

  .uf-prose .uf-gallery.cols-3 .uf-gallery__grid,
  .uf-prose .uf-gallery.cols-4 .uf-gallery__grid{
    grid-template-columns: repeat(2, 1fr);
  }

  .uf-prose .tableWrapper{
    margin: 1.5rem 0;
  }

  .uf-prose th,
  .uf-prose td{
    min-width: 120px;
    padding: 10px 10px;
    font-size: 12px;
  }

  .uf-prose td img,
  .uf-prose th img{
    min-width: 96px;
  }

  .uf-prose .uf-columns[data-stack-mobile="true"]{
    grid-template-columns: 1fr !important;
    gap: 16px;
  }

  .uf-prose .uf-slide-gallery__arrow {
    width: 30px;
    height: 30px;
    font-size: 20px;
  }

  .uf-prose .uf-slide-gallery__arrow--prev {
    left: 8px;
  }

  .uf-prose .uf-slide-gallery__arrow--next {
    right: 8px;
  }

  .uf-prose .uf-slide-gallery__dots {
    gap: 7px;
    margin-top: 10px;
  }

  .uf-prose .uf-slide-gallery__dot {
    width: 6px;
    height: 6px;
  }

  .uf-prose .uf-slide-gallery__dot[data-active="true"] {
    width: 16px;
  }
}
`,
    []
  );

  const editor = useEditor({
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Scene,
      Columns,
      Column,
      UfImage,
      ParallaxImage,
      StickyStory,
      Gallery,
      SlideGallery,
      UfPoll,
      UfPlaylist,
      UfPodcast,
      UfDivider,
      UfCallout,
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

  const { progress, scrollToProgress } = useScrollProgress();
  const { lightbox, setLightbox } = useLightboxFromArticleBody(bodyRef);

  useRevealOnce(bodyRef, [article]);
  useParallaxRuntime([article]);

  const { user, isSaved } = useSavedArticles();
  const saved = article?.editionNo ? isSaved(article.editionNo) : false;
  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);
  const isOwnerEditor =
    !!user?.email &&
    !!article?.authorEmail &&
    user.email === article.authorEmail;

  const canEditArticle = isAdmin || isOwnerEditor;

  const readMinutes = useMemo(() => estimateReadMinutes(article), [article]);
  const readEmoji = useMemo(() => timeEmoji(readMinutes), [readMinutes]);

  useEffect(() => {
    const root = document;

    const updateDots = (track) => {
      if (!track) return;
      const viewport = track.closest(".uf-slide-gallery__viewport");
      if (!viewport) return;

      const dots = viewport.querySelectorAll(".uf-slide-gallery__dot");
      if (!dots.length) return;

      const slide = track.querySelector(".uf-slide-gallery__slide");
      const slideWidth = slide?.getBoundingClientRect?.().width || track.clientWidth || 1;
      const gap = 12;
      const index = Math.round(track.scrollLeft / (slideWidth + gap));

      dots.forEach((dot, i) => {
        dot.setAttribute("data-active", i === index ? "true" : "false");
      });
    };

    const handleSlideArrowClick = (e) => {
      const btn = e.target.closest(".uf-slide-gallery__arrow");
      if (!btn) return;

      const viewport = btn.closest(".uf-slide-gallery__viewport");
      const track = viewport?.querySelector(".uf-slide-gallery__track");
      if (!track) return;

      const slide = track.querySelector(".uf-slide-gallery__slide");
      const slideWidth = slide?.getBoundingClientRect?.().width || track.clientWidth || 0;
      if (!slideWidth) return;

      const gap = 12;
      const amount = slideWidth + gap;
      const dir = btn.getAttribute("data-dir");

      track.scrollBy({
        left: dir === "next" ? amount : -amount,
        behavior: "smooth",
      });

      requestAnimationFrame(() => updateDots(track));
      setTimeout(() => updateDots(track), 220);
      setTimeout(() => updateDots(track), 420);
    };

    const handleSlideDotClick = (e) => {
      const dot = e.target.closest(".uf-slide-gallery__dot");
      if (!dot) return;

      const viewport = dot.closest(".uf-slide-gallery__viewport");
      const track = viewport?.querySelector(".uf-slide-gallery__track");
      if (!track) return;

      const slide = track.querySelector(".uf-slide-gallery__slide");
      const slideWidth = slide?.getBoundingClientRect?.().width || track.clientWidth || 0;
      if (!slideWidth) return;

      const gap = 12;
      const index = Number(dot.getAttribute("data-index") || 0);

      track.scrollTo({
        left: index * (slideWidth + gap),
        behavior: "smooth",
      });

      requestAnimationFrame(() => updateDots(track));
      setTimeout(() => updateDots(track), 220);
      setTimeout(() => updateDots(track), 420);
    };

    const handleTrackScroll = (e) => {
      const track = e.target.closest?.(".uf-slide-gallery__track");
      if (!track) return;
      updateDots(track);
    };

    root.addEventListener("click", handleSlideArrowClick);
    root.addEventListener("click", handleSlideDotClick, true);
    root.addEventListener("scroll", handleTrackScroll, true);

    requestAnimationFrame(() => {
      document
        .querySelectorAll(".uf-slide-gallery__track")
        .forEach((track) => updateDots(track));
    });

    return () => {
      root.removeEventListener("click", handleSlideArrowClick);
      root.removeEventListener("click", handleSlideDotClick, true);
      root.removeEventListener("scroll", handleTrackScroll, true);
    };
  }, [article?.id]);

  useEffect(() => {
    if (!article?.editionNo) return;

    const editionNo = String(article.editionNo);
    const viewKey = `uf_viewed_${editionNo}`;

    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");

    trackEventOnce("view", `view_${editionNo}`, { editionNo });

    const docId = article?.docId || article?.firestoreId || article?.id;
    if (!docId) return;

    updateDoc(doc(db, "articles", String(docId)), { views: increment(1) }).catch((e) => {
      console.warn("[ViewPage] views increment failed:", e?.message || e);
    });
  }, [article?.editionNo, article?.docId, article?.id, article?.firestoreId]);

  useEffect(() => {
    if (!article?.editionNo) return;
    const editionNo = String(article.editionNo);
    const who = user?.uid || "anon";
    const likeKey = `uf_liked_${editionNo}_${who}`;
    setLiked(localStorage.getItem(likeKey) === "1");
  }, [article?.editionNo, user?.uid]);

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

        if (savedSnap.exists()) return;

        tx.set(savedRef, {
          editionNo,
          title: article?.title || null,
          coverMedium: article?.coverMedium || null,
          cover: article?.cover || null,
          category: article?.category || null,
          createdAt: serverTimestamp(),
        });

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
    const already = localStorage.getItem(likeKey) === "1";

    if (!already) {
      localStorage.setItem(likeKey, "1");
      setLiked(true);

      trackEvent("like", { editionNo });

      const docId = article?.docId || article?.firestoreId || article?.id;
      if (docId) {
        updateDoc(doc(db, "articles", String(docId)), { likes: increment(1) }).catch((e) => {
          console.warn("[ViewPage] likes increment failed:", e?.message || e);
        });
      }
      return;
    }

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
        onShare={onShare}
      />

      <ArticleHero
        article={article}
        readMinutes={readMinutes}
        readEmoji={readEmoji}
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
        <ArticleBody ref={bodyRef} article={article} editor={editor} />

        <EditorInfoBox
          article={article}
          currentUser={user}
          onToast={onToast}
        />

        <MoreFromEditor
          article={article}
          isDarkMode={isDarkMode}
        />

        <CommentSection article={article} />

        <PrevNextCards currentArticle={article} />

        <ArticleNav article={article} nav={nav} />
      </main>

      <Lightbox lightbox={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}