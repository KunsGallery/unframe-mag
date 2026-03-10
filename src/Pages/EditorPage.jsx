// src/Pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Save, Send, Plus } from "lucide-react";

import { useEditor, EditorContent } from "@tiptap/react";
import { db } from "../firebase/config";

import SlashMenu from "../components/editor/SlashMenu";
import EditorToolbar from "../components/editor/EditorToolbar";
import InspectorPanel from "../components/editor/InspectorPanel";

import UploadButton from "../components/editor/UploadButton";
import { useUploadImage } from "../hooks/useUploadImage";
import { uploadImageWithProgress } from "../lib/uploadWithProgress";

import { createEditorConfig } from "../tiptap/editorConfig";
import { useDrafts } from "../hooks/useDrafts";
import { useSlashMenu } from "../hooks/useSlashMenu";

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

export default function EditorPage({ isDarkMode, onToast, user, role = "user" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { articleId } = useParams();
  const preloadedDraftId = location.state?.draftId || null;
  const loadedDraftRef = useRef(null);
  const isHydratingRef = useRef(false);
  const toast = (msg) => (onToast ? onToast(msg) : console.log(msg));

  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    return role === "admin" || ADMIN_EMAILS.has(user.email);
  }, [user, role]);

  const isEditor = useMemo(() => !!user && role === "editor", [user, role]);
  const canWrite = isAdmin || isEditor;

  const authorName = useMemo(() => {
    return user?.displayName || "Unknown";
  }, [user?.displayName]);

  const authorEmail = useMemo(() => {
    return user?.email || "";
  }, [user?.email]);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("EDITORIAL");
  const [cover, setCover] = useState("");
  const [coverMedium, setCoverMedium] = useState("");

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  const { upload: uploadCover, uploading: coverUploading, progress: coverProgress } =
    useUploadImage();

  const { slashPos, closeSlashMenu, onEditorKeyDown } = useSlashMenu();

  const editorConfig = useMemo(
    () =>
      createEditorConfig({
        onUploadImage: async (file) => uploadImageWithProgress(file),
        onToast,
      }),
    [onToast]
  );

const editor = useEditor(editorConfig);

  useEffect(() => {
    if (!editor) return;
    const handler = (e) => {
      const url = e.detail?.url;
      if (url) editor.chain().focus().setImage({ src: url }).run();
    };
    window.addEventListener("uf:insert-image", handler);
    return () => window.removeEventListener("uf:insert-image", handler);
  }, [editor]);

  const draftsApi = useDrafts({
    db,
    editor,
    canWrite,
    isAdmin,
    authorName: user?.displayName || "",
    authorEmail: user?.email || "",
    onToast,
    navigate,
  });

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useLayoutEffect(() => {
    const el = subtitleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [subtitle]);

  useEffect(() => {
    if (!editor) return;

    const onUpdate = () => {
      if (isHydratingRef.current) return;
      if (editor.view.composing) return;

      draftsApi.setIsDirty((prev) => (prev ? prev : true));
    };

    editor.on("update", onUpdate);
    return () => editor.off("update", onUpdate);
  }, [editor, draftsApi.setIsDirty]);

  useEffect(() => {
    const cleanup = draftsApi.runAutosave({
      title,
      subtitle,
      category,
      cover,
      coverMedium,
      author: authorName,
      authorEmail,
    });
    return typeof cleanup === "function" ? cleanup : undefined;
  }, [draftsApi, title, subtitle, category, cover, coverMedium, authorName, authorEmail]);

  useEffect(() => {
    if (!editor) return;

    const targetId = preloadedDraftId || articleId;
    if (!targetId) return;
    if (loadedDraftRef.current === targetId) return;

    loadedDraftRef.current = targetId;

    let cancelled = false;

    (async () => {
      try {
        isHydratingRef.current = true;

        await draftsApi.loadDraft(targetId, {
          setTitle,
          setSubtitle,
          setCategory,
          setCover,
          setCoverMedium,
        });

        draftsApi.setIsDirty(false);
      } finally {
        setTimeout(() => {
          if (!cancelled) isHydratingRef.current = false;
        }, 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    editor,
    articleId,
    preloadedDraftId,
    draftsApi,
    setTitle,
    setSubtitle,
    setCategory,
    setCover,
    setCoverMedium,
  ]);

  if (!canWrite) {
    return (
      <div className="p-40 text-center font-black italic uppercase tracking-widest text-zinc-400">
        Access Denied.
      </div>
    );
  }

  return (
    <div
      className={`min-h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-12 gap-px animate-in fade-in duration-500 ${
        isDarkMode ? "bg-zinc-950" : "bg-zinc-100"
      }`}
    >
      <aside
        className={`lg:col-span-3 p-10 flex flex-col gap-10 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto transition-colors ${
          isDarkMode
            ? "bg-zinc-900 border-zinc-800 shadow-2xl"
            : "bg-white border-zinc-50 shadow-xl"
        }`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black italic">
              Drafts
            </p>

            <button
              onClick={() =>
                draftsApi.startNewDraft({
                  setTitle,
                  setSubtitle,
                  setCategory,
                  setCover,
                  setCoverMedium,
                })
              }
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] italic text-[#004aad] hover:opacity-70 transition"
              title="New Draft"
              type="button"
            >
              <Plus size={14} /> NEW
            </button>
          </div>

          <div className="space-y-2">
            {draftsApi.drafts.length === 0 ? (
              <div
                className={`p-5 rounded-2xl border text-[10px] tracking-widest uppercase italic opacity-60 ${
                  isDarkMode
                    ? "border-zinc-800 text-zinc-400"
                    : "border-zinc-100 text-zinc-500"
                }`}
              >
                No drafts yet.
              </div>
            ) : (
              draftsApi.drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() =>
                    draftsApi.loadDraft(d.id, {
                      setTitle,
                      setSubtitle,
                      setCategory,
                      setCover,
                      setCoverMedium,
                    })
                  }
                  className={`w-full text-left p-4 rounded-2xl border transition ${
                    draftsApi.draftId === d.id
                      ? "border-[#004aad] bg-[#004aad]/5"
                      : isDarkMode
                      ? "border-zinc-800 hover:border-zinc-600"
                      : "border-zinc-100 hover:border-zinc-300"
                  }`}
                  type="button"
                >
                  <div className="text-[11px] font-black italic tracking-tight line-clamp-1">
                    {d.title || "(Untitled)"}
                  </div>

                  <div className="mt-1 text-[9px] tracking-widest uppercase opacity-50">
                    {d.category || "EDITORIAL"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8 px-2 uppercase tracking-widest font-black italic">
          <div className="space-y-3">
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest">
              Category
            </label>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                draftsApi.setIsDirty(true);
              }}
              className={`w-full p-4 border-2 text-[12px] focus:outline-none focus:border-[#004aad] transition-colors ${
                isDarkMode
                  ? "bg-zinc-900 border-zinc-700 text-white"
                  : "bg-zinc-50 border-zinc-100 text-black"
              }`}
            >
              <option value="EDITORIAL">EDITORIAL</option>
              <option value="INTERVIEW">INTERVIEW</option>
              <option value="EXHIBITION">EXHIBITION</option>
              <option value="PROJECT">PROJECT</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest">
                Cover
              </label>

              <UploadButton
                label="Upload"
                title="Upload Cover (auto sets Medium)"
                uploading={coverUploading}
                progress={coverProgress}
                onPickFile={async (file) => {
                  try {
                    const { url, coverMedium: cm } = await uploadCover(file, {
                      variant: "cover",
                    });
                    setCover(url);
                    setCoverMedium(cm || url);
                    draftsApi.setIsDirty(true);
                    toast("커버 업로드 완료");
                  } catch (e) {
                    console.error(e);
                    toast("커버 업로드 실패");
                  }
                }}
              />
            </div>

            <input
              type="text"
              placeholder="Cover URL"
              value={cover}
              onChange={(e) => {
                setCover(e.target.value);
                draftsApi.setIsDirty(true);
              }}
              className={`w-full p-3 text-[10px] border-b focus:outline-none bg-transparent ${
                isDarkMode ? "border-zinc-800" : "border-zinc-200"
              }`}
            />

            <input
              type="text"
              placeholder="Cover Medium URL (auto)"
              value={coverMedium}
              onChange={(e) => {
                setCoverMedium(e.target.value);
                draftsApi.setIsDirty(true);
              }}
              className={`w-full p-3 text-[10px] border-b focus:outline-none bg-transparent ${
                isDarkMode ? "border-zinc-800" : "border-zinc-200"
              }`}
            />
          </div>
        </div>

        <div className="mt-auto space-y-4 px-2 pb-6">
          <button
            onClick={() =>
              draftsApi.saveDraft(
                { silent: false, markClean: true },
                {
                  title,
                  subtitle,
                  category,
                  cover,
                  coverMedium,
                  author: authorName,
                  authorEmail,
                }
              )
            }
            disabled={draftsApi.isSaving || draftsApi.isDraftLoading}
            className={`w-full py-5 font-black uppercase tracking-[0.5em] text-[10px] flex items-center justify-center gap-3 transition-all hover:opacity-70 rounded-2xl ${
              isDarkMode ? "bg-zinc-800 text-zinc-300" : "bg-zinc-50 text-zinc-500"
            }`}
            type="button"
          >
            <Save size={14} /> {draftsApi.isSaving ? "SAVING..." : "Save Draft"}
          </button>

          <button
            onClick={() =>
              draftsApi.publish({
                title,
                subtitle,
                category,
                cover,
                coverMedium,
                author: authorName,
                authorEmail,
              })
            }
            disabled={draftsApi.isSaving || draftsApi.isDraftLoading}
            className="w-full py-5 bg-[#004aad] text-white font-black uppercase tracking-[0.5em] text-[10px] flex items-center justify-center gap-3 hover:bg-black shadow-xl transition-all rounded-2xl italic"
            type="button"
          >
            <Send size={14} /> {draftsApi.isSaving ? "PUBLISHING..." : "Publish Issue"}
          </button>
        </div>
      </aside>

      <main
        className={`lg:col-span-9 flex transition-colors duration-500 ${
          isDarkMode ? "bg-black" : "bg-white"
        }`}
      >
        <div className="flex-1 flex flex-col">
          <EditorToolbar editor={editor} isDarkMode={isDarkMode} onToast={onToast} />

          <div className="grow p-12 md:p-32 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-16">
              <div className="space-y-4">
                <textarea
                  ref={titleRef}
                  rows={1}
                  placeholder="ENTER TITLE..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    draftsApi.setIsDirty(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      subtitleRef.current?.focus();
                    }
                  }}
                  className={`uf-title-textarea w-full resize-none overflow-hidden text-7xl font-black italic tracking-tighter leading-[1.02] focus:outline-none bg-transparent placeholder:text-zinc-100 dark:placeholder:text-zinc-900 ${
                    isDarkMode ? "text-white" : "text-black"
                  }`}
                />

                <div className="h-2 w-24 bg-[#004aad] shadow-[0_0_15px_#004aad]" />
              </div>

              <textarea
                ref={subtitleRef}
                rows={1}
                placeholder="Subtitle here..."
                value={subtitle}
                onChange={(e) => {
                  setSubtitle(e.target.value);
                  draftsApi.setIsDirty(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    editor?.chain().focus().run();
                    return;
                  }

                  if (e.key === "Backspace" && !subtitle) {
                    e.preventDefault();
                    titleRef.current?.focus();
                    const len = titleRef.current?.value?.length ?? 0;
                    titleRef.current?.setSelectionRange?.(len, len);
                  }
                }}
                className={`uf-subtitle-textarea w-full resize-none overflow-hidden text-2xl font-light italic leading-[1.5] focus:outline-none bg-transparent border-l-4 border-[#004aad] pl-8 ${
                  isDarkMode ? "text-zinc-500" : "text-zinc-400"
                }`}
              />

              <div className="editor-container relative">
                <SlashMenu pos={slashPos} onClose={closeSlashMenu} editor={editor} />

                <EditorContent
                  editor={editor}
                  onKeyDown={(e) => {
                    const native = e.nativeEvent;
                    if (native?.isComposing || native?.keyCode === 229) return;
                    onEditorKeyDown(editor, e);
                  }}
                  onClick={() => closeSlashMenu()}
                />
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.4em] italic text-zinc-400">
                {draftsApi.lastAutoSavedAt ? "AUTOSAVED" : ""}
                {draftsApi.isDirty ? "  •  EDITING…" : ""}
              </div>
            </div>
          </div>
        </div>

        <InspectorPanel editor={editor} isDarkMode={isDarkMode} onToast={onToast} />
      </main>

      <style>{`
        .uf-title-textarea,
        .uf-subtitle-textarea {
          overflow: hidden;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

       .ProseMirror.uf-editor {
          min-height: 500px;
          outline: none;
       }

        .uf-editor,
        .uf-prose{
          color: inherit;
          font-style: normal;
          font-weight: 300;
          font-size: 18px;
          line-height: 1.95;
          letter-spacing: 0.01em;
          word-break: keep-all;
          overflow-wrap: break-word;
        }

        .uf-editor p,
        .uf-prose p{
          margin: 0 0 1.6em;
        }

        .uf-editor h1,
        .uf-editor h2,
        .uf-editor h3,
        .uf-prose h1,
        .uf-prose h2,
        .uf-prose h3{
          font-style: italic;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 1.2em 0 0.5em;
        }

        .uf-editor h1,
        .uf-prose h1{ font-size: 3.4rem; }

        .uf-editor h2,
        .uf-prose h2{ font-size: 2.4rem; }

        .uf-editor h3,
        .uf-prose h3{ font-size: 1.7rem; }

        .uf-editor blockquote,
        .uf-prose blockquote{
          margin: 2em 0;
          padding-left: 1.25em;
          border-left: 4px solid #004aad;
          font-style: italic;
        }

        .uf-editor ul,
        .uf-editor ol,
        .uf-prose ul,
        .uf-prose ol{
          margin: 0 0 1.6em 1.25em;
          padding-left: 1.1em;
        }

        .uf-editor li,
        .uf-prose li{
          margin: 0.35em 0;
        }

        .uf-editor hr,
        .uf-prose hr{
          margin: 3em 0;
          border: 0;
          border-top: 1px solid rgba(113,113,122,.25);
        }

        .uf-editor img,
        .uf-prose img{
          display: block;
          max-width: 100%;
          height: auto;
        }

        .uf-editor pre,
        .uf-prose pre{
          margin: 1.8em 0;
          padding: 1.1em 1.2em;
          border-radius: 16px;
          overflow-x: auto;
        }

        .uf-editor :last-child,
        .uf-prose :last-child{
          margin-bottom: 0;
        }

        .uf-editor :is(p, h1, h2, h3, blockquote, ul, ol, pre){
          position: relative;
        }

        .uf-editor :is(p, h1, h2, h3, blockquote, ul, ol, pre):hover::before{
          content: "⋮⋮";
          position: absolute;
          left: -28px;
          top: .2rem;
          font-size: 14px;
          letter-spacing: 2px;
          opacity: .35;
          color: #004aad;
        }

        .uf-editor .uf-divider,
        .uf-prose .uf-divider{
          width: 100%;
          margin: 3em 0;
          position: relative;
        }

        .uf-editor .uf-divider.is-line,
        .uf-prose .uf-divider.is-line{
          height: 1px;
          background: rgba(113,113,122,.25);
        }

        .uf-editor .uf-divider.is-dashed,
        .uf-prose .uf-divider.is-dashed{
          height: 0;
          border-top: 1px dashed rgba(113,113,122,.35);
        }

        .uf-editor .uf-divider.is-double,
        .uf-prose .uf-divider.is-double{
          height: 8px;
          border-top: 1px solid rgba(113,113,122,.28);
          border-bottom: 1px solid rgba(113,113,122,.28);
        }

        .uf-editor .uf-divider.is-dots,
        .uf-prose .uf-divider.is-dots{
          height: 10px;
          background:
            radial-gradient(circle, rgba(113,113,122,.45) 1.5px, transparent 1.7px)
            center / 14px 10px repeat-x;
        }

        .uf-editor .uf-divider.is-fade,
        .uf-prose .uf-divider.is-fade{
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(113,113,122,.38), transparent);
        }

        .uf-editor .uf-divider.is-glow,
        .uf-prose .uf-divider.is-glow{
          height: 2px;
          background: linear-gradient(90deg, transparent, #004aad, transparent);
          box-shadow: 0 0 18px rgba(0,74,173,.35);
        }

        .uf-editor .uf-divider.is-space,
        .uf-prose .uf-divider.is-space{
          height: 48px;
        }

        .uf-editor .uf-callout,
        .uf-prose .uf-callout{
          margin: 2.2em 0;
          padding: 1.2em 1.2em 1.15em;
          border: 1px solid rgba(113,113,122,.18);
          border-radius: 22px;
          background: rgba(255,255,255,.45);
          backdrop-filter: blur(12px);
        }

        .dark .uf-editor .uf-callout,
        .dark .uf-prose .uf-callout{
          background: rgba(24,24,27,.55);
          border-color: rgba(255,255,255,.08);
        }

        .uf-editor .uf-callout__label,
        .uf-prose .uf-callout__label{
          margin-bottom: .8em;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: #004aad;
        }

        .uf-editor .uf-callout__body > :last-child,
        .uf-prose .uf-callout__body > :last-child{
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}