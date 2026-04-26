// src/Pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Save, Send, Plus, ChevronDown, ChevronUp, CircleHelp } from "lucide-react";

import { useEditor, EditorContent } from "@tiptap/react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

import SlashMenu from "../components/editor/SlashMenu";
import EditorToolbar from "../components/editor/EditorToolbar";
import InspectorPanel from "../components/editor/InspectorPanel";
import BlockQuickBar from "../components/editor/BlockQuickBar";
import BlockSideInserter from "../components/editor/BlockSideInserter";

import UploadButton from "../components/editor/UploadButton";
import { useUploadImage } from "../hooks/useUploadImage";
import { uploadImageWithProgress } from "../lib/uploadWithProgress";

import { createEditorConfig } from "../tiptap/editorConfig";
import { useDrafts } from "../hooks/useDrafts";
import { useSlashMenu } from "../hooks/useSlashMenu";
import EditorOnboardingModal from "../components/editor/EditorOnboardingModal";
import {
  shouldOpenEditorOnboarding,
  hideEditorOnboardingForever,
} from "../lib/editorOnboarding";
import { isAdminEmail } from "../constants/admin";
import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_CATEGORY } from "../constants/categories";

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
    return role === "admin" || isAdminEmail(user.email);
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
  const [category, setCategory] = useState(DEFAULT_ARTICLE_CATEGORY);
  const [cover, setCover] = useState("");
  const [coverMedium, setCoverMedium] = useState("");
  const [previewMode, setPreviewMode] = useState("hero");
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  const previewCover = coverMedium || cover || "";
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

  const [editorDocMeta, setEditorDocMeta] = useState(null);
  const [loadingEditorMeta, setLoadingEditorMeta] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const previewBodyText = editor?.getText?.()?.trim?.() || "";
  const previewExcerpt = previewBodyText
    ? previewBodyText.slice(0, 220) + (previewBodyText.length > 220 ? "..." : "")
    : "본문 미리보기가 여기에 표시됩니다.";

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
  const {
    draftId,
    isDirty,
    lastAutoSavedAt,
    loadDraft,
    runAutosave,
    setIsDirty: setDraftDirty,
  } = draftsApi;

  const saveStatusText = useMemo(() => {
    if (!lastAutoSavedAt) return isDirty ? "Unsaved changes" : "Not saved yet";

    try {
      const d =
        typeof lastAutoSavedAt?.toDate === "function"
          ? lastAutoSavedAt.toDate()
          : new Date(lastAutoSavedAt);

      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");

      return isDirty ? `Saved at ${hh}:${mm} · modified again` : `Saved at ${hh}:${mm}`;
    } catch {
      return isDirty ? "Unsaved changes" : "Saved";
    }
  }, [lastAutoSavedAt, isDirty]);

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

      setDraftDirty((prev) => (prev ? prev : true));
    };

    editor.on("update", onUpdate);
    return () => editor.off("update", onUpdate);
  }, [editor, setDraftDirty]);

  useEffect(() => {
    const cleanup = runAutosave({
      title,
      subtitle,
      category,
      cover,
      coverMedium,
      author: authorName,
      authorEmail,
    });
    return typeof cleanup === "function" ? cleanup : undefined;
  }, [runAutosave, title, subtitle, category, cover, coverMedium, authorName, authorEmail]);

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

        await loadDraft(targetId, {
          setTitle,
          setSubtitle,
          setCategory,
          setCover,
          setCoverMedium,
        });

        setDraftDirty(false);
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
    loadDraft,
    setDraftDirty,
    setTitle,
    setSubtitle,
    setCategory,
    setCover,
    setCoverMedium,
  ]);

  useEffect(() => {
    const currentId = draftId || articleId;
    if (!currentId) {
      setEditorDocMeta(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingEditorMeta(true);
        const snap = await getDoc(doc(db, "articles", currentId));
        if (cancelled) return;

        if (snap.exists()) {
          setEditorDocMeta({ id: snap.id, ...snap.data() });
        } else {
          setEditorDocMeta(null);
        }
      } catch (e) {
        console.error("[EditorPage] meta load failed:", e);
        if (!cancelled) setEditorDocMeta(null);
      } finally {
        if (!cancelled) setLoadingEditorMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftId, articleId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldOpenEditorOnboarding()) {
        setShowOnboarding(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (!canWrite) {
    return (
      <div className="p-40 text-center font-black italic uppercase tracking-widest text-zinc-400">
        Access Denied.
      </div>
    );
  }

  return (
    <div
      className={`min-h-[calc(100vh-80px)] grid grid-cols-1 xl:grid-cols-12 gap-px animate-in fade-in duration-500 ${
        isDarkMode ? "bg-zinc-950" : "bg-zinc-100"
      }`}
    >
      <aside
        className={`min-w-0 xl:col-span-3 p-6 xl:p-10 flex flex-col gap-10 xl:sticky xl:top-[80px] xl:h-[calc(100vh-80px)] overflow-y-auto transition-colors ${
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
              onClick={() => {
                loadedDraftRef.current = null;
                draftsApi.startNewDraft({
                  setTitle,
                  setSubtitle,
                  setCategory,
                  setCover,
                  setCoverMedium,
                });
                setEditorDocMeta(null);
              }}
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
                  onClick={() => {
                    loadedDraftRef.current = null;
                    draftsApi.loadDraft(d.id, {
                      setTitle,
                      setSubtitle,
                      setCategory,
                      setCover,
                      setCoverMedium,
                    });
                  }}
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
                    {d.category || DEFAULT_ARTICLE_CATEGORY}
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
              {ARTICLE_CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.key}
                </option>
              ))}
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
        className={`min-w-0 xl:col-span-9 flex transition-colors duration-500 ${
          isDarkMode ? "bg-black" : "bg-white"
        }`}
      >
        <div className="flex-1 flex flex-col">
          <EditorToolbar editor={editor} isDarkMode={isDarkMode} onToast={onToast} />

          <div
            className={`px-6 md:px-10 pt-5 pb-3 border-b ${
              isDarkMode ? "border-zinc-900" : "border-zinc-100"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {loadingEditorMeta ? (
                  <span
                    className={`text-[10px] font-black tracking-[0.25em] uppercase italic px-3 py-1.5 rounded-full ${
                      isDarkMode
                        ? "bg-zinc-900 text-zinc-400"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    loading
                  </span>
                ) : editorDocMeta?.editMode === "revision" ? (
                  <span className="text-[10px] font-black tracking-[0.25em] uppercase italic px-3 py-1.5 rounded-full bg-[#004aad] text-white">
                    revision draft
                  </span>
                ) : editorDocMeta?.status === "published" ? (
                  <span className="text-[10px] font-black tracking-[0.25em] uppercase italic px-3 py-1.5 rounded-full bg-emerald-600 text-white">
                    published
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-black tracking-[0.25em] uppercase italic px-3 py-1.5 rounded-full ${
                      isDarkMode
                        ? "bg-zinc-900 text-zinc-300"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    draft
                  </span>
                )}

                {editorDocMeta?.sourceEditionNo && (
                  <span
                    className={`text-[10px] font-black tracking-[0.22em] uppercase italic px-3 py-1.5 rounded-full ${
                      isDarkMode
                        ? "bg-zinc-900 text-zinc-400"
                        : "bg-black/5 text-zinc-600"
                    }`}
                  >
                    from #{String(editorDocMeta.sourceEditionNo).padStart(3, "0")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOnboarding(true)}
                  className={`h-8 px-3 rounded-lg border flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] italic transition ${
                    isDarkMode
                      ? "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <CircleHelp size={14} />
                  Guide
                </button>

                <div
                  className={`text-[11px] font-black italic ${
                    draftsApi.isDirty ? "text-amber-500" : "text-zinc-400"
                  }`}
                >
                  {saveStatusText}
                </div>
              </div>
            </div>
          </div>

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
                <SlashMenu pos={slashPos} onClose={closeSlashMenu} editor={editor} onToast={onToast} />

                <BlockSideInserter editor={editor} isDarkMode={isDarkMode} onToast={onToast} />

                <BlockQuickBar editor={editor} isDarkMode={isDarkMode} />

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

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] italic text-zinc-400">
                    Preview
                  </div>

                  <div className="flex items-center gap-2">
                    {!previewCollapsed && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewMode("hero")}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] italic transition ${
                            previewMode === "hero"
                              ? "bg-[#004aad] text-white"
                              : isDarkMode
                              ? "bg-zinc-900 text-zinc-400"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          Hero
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewMode("pick")}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] italic transition ${
                            previewMode === "pick"
                              ? "bg-[#004aad] text-white"
                              : isDarkMode
                              ? "bg-zinc-900 text-zinc-400"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          Pick
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewMode("article")}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] italic transition ${
                            previewMode === "article"
                              ? "bg-[#004aad] text-white"
                              : isDarkMode
                              ? "bg-zinc-900 text-zinc-400"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          Article
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setPreviewCollapsed((prev) => !prev)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] italic transition ${
                        isDarkMode
                          ? "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {previewCollapsed ? (
                        <>
                          <ChevronDown size={14} />
                          Expand
                        </>
                      ) : (
                        <>
                          <ChevronUp size={14} />
                          Collapse
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!previewCollapsed && (
                  <>
                    {previewMode === "hero" && (
                      <div
                        className={`rounded-[28px] overflow-hidden border ${
                          isDarkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-[#fcfcfc]"
                        }`}
                      >
                        <div className="grid md:grid-cols-[1.1fr_0.9fr] min-h-[420px]">
                          <div className="p-10 md:p-14 flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.4em] italic text-[#004aad]">
                                {category || DEFAULT_ARTICLE_CATEGORY}
                              </div>

                              <h2 className="mt-6 text-5xl md:text-6xl font-black italic tracking-tighter leading-[0.95] break-keep">
                                {title || "ENTER TITLE..."}
                              </h2>

                              <p className="mt-6 text-lg md:text-xl font-light italic leading-[1.5] text-zinc-400 break-keep">
                                {subtitle || "Subtitle preview appears here."}
                              </p>
                            </div>

                            <div className="pt-10 text-[11px] font-black uppercase tracking-[0.3em] italic text-zinc-400">
                              by {authorName}
                            </div>
                          </div>

                          <div className="relative min-h-[280px]">
                            {previewCover ? (
                              <img
                                src={previewCover}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.3em] italic text-zinc-400">
                                No Cover
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {previewMode === "pick" && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div
                          className={`rounded-[24px] overflow-hidden border ${
                            isDarkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"
                          }`}
                        >
                          <div className="aspect-4/3 relative">
                            {previewCover ? (
                              <img
                                src={previewCover}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.3em] italic text-zinc-400">
                                No Cover
                              </div>
                            )}
                          </div>

                          <div className="p-6">
                            <div className="text-[10px] font-black uppercase tracking-[0.35em] italic text-[#004aad]">
                              {category || DEFAULT_ARTICLE_CATEGORY}
                            </div>
                            <h3 className="mt-4 text-2xl font-black italic tracking-tight leading-[1.02] break-keep line-clamp-3">
                              {title || "ENTER TITLE..."}
                            </h3>
                            <p className="mt-3 text-sm leading-[1.6] text-zinc-400 break-keep line-clamp-3">
                              {subtitle || "Subtitle preview appears here."}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`rounded-[24px] overflow-hidden border ${
                            isDarkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"
                          }`}
                        >
                          <div className="p-6">
                            <div className="text-[10px] font-black uppercase tracking-[0.35em] italic text-[#004aad]">
                              Compact Card
                            </div>
                            <h3 className="mt-4 text-xl font-black italic tracking-tight leading-[1.06] break-keep line-clamp-3">
                              {title || "ENTER TITLE..."}
                            </h3>
                            <p className="mt-3 text-sm leading-[1.6] text-zinc-400 break-keep line-clamp-2">
                              {subtitle || "Subtitle preview appears here."}
                            </p>
                          </div>

                          <div className="aspect-16/9 relative border-t border-zinc-200 dark:border-zinc-800">
                            {previewCover ? (
                              <img
                                src={previewCover}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.3em] italic text-zinc-400">
                                No Cover
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {previewMode === "article" && (
                      <div
                        className={`rounded-[28px] overflow-hidden border ${
                          isDarkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-[#fcfcfc]"
                        }`}
                      >
                        <div className="relative aspect-16/7">
                          {previewCover ? (
                            <img
                              src={previewCover}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900" />
                          )}
                          <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/25 to-transparent" />
                          <div className="absolute left-0 right-0 bottom-0 p-8 md:p-12">
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] italic text-[#7db5ff]">
                              {category || DEFAULT_ARTICLE_CATEGORY}
                            </div>
                            <h2 className="mt-4 text-4xl md:text-5xl font-black italic tracking-tighter leading-[0.97] text-white break-keep">
                              {title || "ENTER TITLE..."}
                            </h2>
                            <p className="mt-4 text-base md:text-lg italic leading-[1.5] text-white/75 break-keep">
                              {subtitle || "Subtitle preview appears here."}
                            </p>
                          </div>
                        </div>

                        <div className="p-8 md:p-12">
                          <div className="max-w-3xl">
                            <div className="text-[10px] font-black uppercase tracking-[0.35em] italic text-zinc-400">
                              Article Body Preview
                            </div>
                            <p className="mt-6 text-[18px] leading-[1.95] font-light break-keep">
                              {previewExcerpt}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <EditorOnboardingModal
        isOpen={showOnboarding}
        isDarkMode={isDarkMode}
        onClose={() => setShowOnboarding(false)}
        onNeverShowAgain={() => {
          hideEditorOnboardingForever();
          setShowOnboarding(false);
        }}
      />

        <InspectorPanel editor={editor} isDarkMode={isDarkMode} onToast={onToast} />
      </main>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

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

        .uf-editor img, .uf-prose img{
          display: block;
          max-width: 100%;
          height: auto;
        }

        /* ===== Editor-only UfImage overrides ===== */
        .uf-editor .uf-img {
          width: 100%;
          max-width: 100%;
        }

        .uf-editor .uf-img.is-xsmall {
          max-width: 320px;
        }

        .uf-editor .uf-img.is-small {
          max-width: 460px;
        }

        .uf-editor .uf-img.is-normal {
          max-width: 720px;
        }

        .uf-editor .uf-img.is-wide {
          max-width: min(900px, 100%);
        }

        /* ✅ 에디터에서는 full도 편집 영역 안에서만 */
        .uf-editor .uf-img.is-full {
          width: 100%;
          max-width: 100%;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        /* ✅ 정렬이 눈에 띄게 보이도록 wrapper 기준으로 처리 */
        .uf-editor .uf-img.align-left {
          margin-left: 0;
          margin-right: auto;
        }

        .uf-editor .uf-img.align-center {
          margin-left: auto;
          margin-right: auto;
        }

        .uf-editor .uf-img.align-right {
          margin-left: auto;
          margin-right: 0;
        }

        /* 에디터 안에서는 정렬 확인이 잘 되도록 살짝 가이드 */
        .uf-editor .uf-img.align-left,
        .uf-editor .uf-img.align-center,
        .uf-editor .uf-img.align-right {
          transition: margin .18s ease, max-width .18s ease;
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
          background: rgba(255,255,255,.55);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }

        .dark .uf-editor .uf-callout,
        .dark .uf-prose .uf-callout{
          background: rgba(24,24,27,.62);
          border-color: rgba(255,255,255,.08);
        }

        .uf-editor .uf-callout::before,
        .uf-prose .uf-callout::before{
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: rgba(0,74,173,.7);
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

        .uf-editor .uf-callout.is-note,
        .uf-prose .uf-callout.is-note{
          background: rgba(255,255,255,.58);
          border-color: rgba(113,113,122,.16);
        }
        .dark .uf-editor .uf-callout.is-note,
        .dark .uf-prose .uf-callout.is-note{
          background: rgba(24,24,27,.62);
        }
        .uf-editor .uf-callout.is-note::before,
        .uf-prose .uf-callout.is-note::before{
          background: rgba(0,74,173,.72);
        }
        .uf-editor .uf-callout.is-note .uf-callout__label,
        .uf-prose .uf-callout.is-note .uf-callout__label{
          color: #004aad;
        }

        .uf-editor .uf-callout.is-point,
        .uf-prose .uf-callout.is-point{
          background: linear-gradient(180deg, rgba(0,74,173,.08), rgba(255,255,255,.7));
          border-color: rgba(0,74,173,.24);
          box-shadow: 0 10px 30px rgba(0,74,173,.08);
        }
        .dark .uf-editor .uf-callout.is-point,
        .dark .uf-prose .uf-callout.is-point{
          background: linear-gradient(180deg, rgba(0,74,173,.18), rgba(24,24,27,.72));
          border-color: rgba(0,74,173,.24);
        }
        .uf-editor .uf-callout.is-point::before,
        .uf-prose .uf-callout.is-point::before{
          background: #004aad;
        }
        .uf-editor .uf-callout.is-point .uf-callout__label,
        .uf-prose .uf-callout.is-point .uf-callout__label{
          color: #004aad;
        }

        .uf-editor .uf-callout.is-info,
        .uf-prose .uf-callout.is-info{
          background: linear-gradient(180deg, rgba(16,185,129,.06), rgba(255,255,255,.68));
          border-color: rgba(16,185,129,.24);
        }
        .dark .uf-editor .uf-callout.is-info,
        .dark .uf-prose .uf-callout.is-info{
          background: linear-gradient(180deg, rgba(16,185,129,.12), rgba(24,24,27,.72));
          border-color: rgba(16,185,129,.22);
        }
        .uf-editor .uf-callout.is-info::before,
        .uf-prose .uf-callout.is-info::before{
          background: rgba(16,185,129,.85);
        }
        .uf-editor .uf-callout.is-info .uf-callout__label,
        .uf-prose .uf-callout.is-info .uf-callout__label{
          color: rgba(5,150,105,1);
        }

        .uf-editor .uf-callout.is-quote,
        .uf-prose .uf-callout.is-quote{
          background: rgba(244,244,245,.72);
          border-color: rgba(113,113,122,.18);
        }
        .dark .uf-editor .uf-callout.is-quote,
        .dark .uf-prose .uf-callout.is-quote{
          background: rgba(39,39,42,.82);
        }
        .uf-editor .uf-callout.is-quote::before,
        .uf-prose .uf-callout.is-quote::before{
          background: rgba(161,161,170,.9);
        }
        .uf-editor .uf-callout.is-quote .uf-callout__label,
        .uf-prose .uf-callout.is-quote .uf-callout__label{
          color: rgba(113,113,122,1);
        }
        .uf-editor .uf-callout.is-quote .uf-callout__body,
        .uf-prose .uf-callout.is-quote .uf-callout__body{
          font-style: italic;
        }

                /* ===== Editor-only Columns visibility ===== */
        .uf-editor .uf-columns {
          position: relative;
          display: grid;
          gap: var(--uf-columns-gap, 24px);
          margin: 2.2rem 0;
          padding: 14px;
          border: 1px dashed rgba(0, 74, 173, 0.28);
          border-radius: 20px;
          background: rgba(0, 74, 173, 0.03);
        }

        .dark .uf-editor .uf-columns {
          border-color: rgba(125, 181, 255, 0.22);
          background: rgba(0, 74, 173, 0.08);
        }

        .uf-editor .uf-columns[data-columns="2"] {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .uf-editor .uf-columns[data-columns="3"] {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .uf-editor .uf-columns[data-valign="center"] {
          align-items: center;
        }

        .uf-editor .uf-column {
          min-width: 0;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-sizing: border-box;
        }

        .dark .uf-editor .uf-column {
          background: rgba(24, 24, 27, 0.72);
          border-color: rgba(255, 255, 255, 0.06);
        }

        .uf-editor .uf-column > :first-child {
          margin-top: 0;
        }

        .uf-editor .uf-column > :last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
