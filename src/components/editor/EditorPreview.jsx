import "../../styles/article-runtime.css";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor } from '@tiptap/react';
import { Monitor, Smartphone, X } from 'lucide-react';
import { createEditorConfig } from '../../tiptap/editorConfig';
import ArticleHero from '../view/ArticleHero';
import ArticleBody from '../view/ArticleBody';
import { useSlideGalleryRuntime } from '../../hooks/useSlideGalleryRuntime';
import { estimateReadMinutes } from '../../lib/readingMeta';
import { buildSpotifyEmbed, buildYouTubeEmbed } from '../../lib/ufEmbed';
import { getParallaxMotionSpeed, PARALLAX_DEFAULTS } from '../../constants/editorBlocks';

function safePreviewContent(content) {
  if (!content || typeof content !== 'object') return { type: 'doc', content: [] };
  const copy = structuredClone(content);
  function visit(node) {
    if (['ufPlaylist', 'ufPodcast'].includes(node.type)) {
      const attrs = node.attrs || {};
      const url = attrs.url || attrs.embedUrl;
      node.attrs = { ...attrs, embedUrl: buildSpotifyEmbed(url) || buildYouTubeEmbed(url) || '' };
    }
    if (Array.isArray(node.content)) node.content.forEach(visit);
  }
  visit(copy);
  return copy;
}

function PreviewArticle({ content, meta }) {
  const bodyRef = useRef(null);
  const [config] = useState(() => {
    const base = createEditorConfig({});
    return {
      immediatelyRender: false,
      editable: false,
      extensions: base.extensions.filter((extension) =>
        !['placeholder', 'editorKeyBehavior', 'pasteSanitizer', 'searchReplace', 'imageUploads'].includes(extension.name)
      ).map((extension) => extension.name === 'table'
        ? extension.configure({ resizable: false }) : extension),
      content: safePreviewContent(content),
      editorProps: { attributes: { class: 'ProseMirror uf-prose uf-view max-w-none focus:outline-none' } },
    };
  });
  const editor = useEditor(config);
  useEffect(() => {
    if (editor) editor.commands.setContent(safePreviewContent(content), { emitUpdate: false });
  }, [editor, content]);
  useSlideGalleryRuntime(bodyRef, editor);
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || !editor) return;
    const figures = [...root.querySelectorAll('[data-uf="parallax"]')];
    if (!figures.length) return;
    const view = root.ownerDocument.defaultView;
    const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const positions = new Map();
    function tick() {
      figures.forEach((figure) => {
        const image = figure.querySelector('.uf-parallax__img');
        if (!image) return;
        if (motion.matches) { image.style.transform = ''; return; }
        const rect = figure.getBoundingClientRect();
        if (rect.bottom < -250 || rect.top > view.innerHeight + 250) return;
        const raw = figure.getAttribute('data-speed') || figure.getAttribute('speed');
        const preset = getParallaxMotionSpeed(figure.getAttribute('data-motion-preset'), PARALLAX_DEFAULTS.speed);
        const speed = Math.min(0.34, Math.max(0.04, raw && Number.isFinite(Number(raw)) ? Number(raw) : preset));
        const progress = (rect.top + rect.height) / (view.innerHeight + rect.height);
        const target = -(0.5 - progress) * 2 * 400 * speed;
        const current = positions.get(image) || 0;
        const next = current + (target - current) * 0.1;
        positions.set(image, next);
        image.style.transform = `translate3d(0, calc(-50% + ${next}px), 0)`;
      });
      frame = view.requestAnimationFrame(tick);
    }
    frame = view.requestAnimationFrame(tick);
    return () => view.cancelAnimationFrame(frame);
  }, [editor]);
  return <div className="uf-page min-h-screen bg-[var(--uf-bg)] text-[var(--uf-text)]">
    <ArticleHero article={meta} authorName={meta.author} readMinutes={estimateReadMinutes({ ...meta, contentHTML: editor?.getHTML() || '' })} />
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-20">
      <ArticleBody ref={bodyRef} article={meta} editor={editor} />
    </main>
  </div>;
}

// Parent mounts this component only while preview is open.
export default function EditorPreview({ content, meta = {}, onClose, isDarkMode = false }) {
  const dialog = useRef(null);
  const [viewport, setViewport] = useState('desktop');
  const [frameDocument, setFrameDocument] = useState(null);
  const heading = React.useId();
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { if (element.open) element.close(); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    if (!frameDocument) return;
    frameDocument.documentElement.classList.toggle('dark', isDarkMode);
  }, [frameDocument, isDarkMode]);
  function initializeFrame(event) {
    const doc = event.currentTarget.contentDocument;
    // Copy trusted app styles, never article HTML, into the independent viewport.
    doc.head.replaceChildren();
    const base = doc.createElement('base');
    base.href = document.baseURI;
    doc.head.append(base);
    document.querySelectorAll('style:not([data-uf-editor-styles]), link[rel="stylesheet"]').forEach((element) =>
      doc.head.append(element.cloneNode(true)));
    doc.documentElement.classList.toggle('dark', isDarkMode);
    doc.body.style.margin = '0';
    setFrameDocument(doc);
  }
  return <dialog ref={dialog} aria-labelledby={heading}
    onCancel={(event) => { event.preventDefault(); onClose?.(); }}
    className="m-auto w-[calc(100vw-24px)] max-w-none h-[calc(100dvh-24px)] max-h-none rounded-lg bg-[var(--uf-bg)] text-[var(--uf-text)] p-0 backdrop:bg-black/60">
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-300 px-4 py-2">
        <h2 id={heading} className="text-base font-bold">기사 미리보기</h2>
        <div role="group" aria-label="미리보기 화면 크기" className="flex gap-1">
          {[['desktop', Monitor, '데스크톱'], ['mobile', Smartphone, '모바일']].map(([value, Icon, label]) =>
            <button key={value} type="button" aria-label={label} title={label} aria-pressed={viewport === value}
              onClick={() => setViewport(value)} className="min-h-11 min-w-11 rounded p-3 aria-pressed:bg-zinc-200"><Icon aria-hidden="true" size={20} /></button>)}
          <button autoFocus type="button" aria-label="미리보기 닫기" title="닫기" onClick={onClose} className="min-h-11 min-w-11 p-3"><X aria-hidden="true" size={20} /></button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto bg-zinc-200 p-2">
        <iframe title={viewport === 'mobile' ? '모바일 기사 미리보기' : '데스크톱 기사 미리보기'}
          onLoad={initializeFrame} srcDoc="<!doctype html><html lang='ko'><head></head><body></body></html>"
          className="mx-auto block h-full border-0 bg-white"
          style={{ width: viewport === 'mobile' ? 390 : 1280, maxWidth: viewport === 'mobile' ? '100%' : undefined }} />
        {frameDocument && createPortal(<PreviewArticle content={content} meta={meta} />, frameDocument.body)}
      </div>
    </div>
  </dialog>;
}

