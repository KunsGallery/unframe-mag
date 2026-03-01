// src/Pages/EditorPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const ADMIN_EMAILS = [
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
];

export default function EditorPage({ isDarkMode, onToast, user }) {
  const navigate = useNavigate();
  const toast = (msg) => (onToast ? onToast(msg) : console.log(msg));

  const isAdmin = useMemo(
    () => !!user && ADMIN_EMAILS.includes(user.email),
    [user]
  );

  // 메타
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("EDITORIAL");
  const [cover, setCover] = useState("");
  const [coverMedium, setCoverMedium] = useState("");

  // ✅ cover 업로드(진행률 포함)
  const {
    upload: uploadCover,
    uploading: coverUploading,
    progress: coverProgress,
  } = useUploadImage();

  // SlashMenu
  const { slashPos, closeSlashMenu, onEditorKeyDown } = useSlashMenu();

  // TipTap config
  const editor = useEditor(
    createEditorConfig({
      // ✅ 붙여넣기/드롭 업로드도 progress 엔진으로 통일(진행률 UI는 추후)
      onUploadImage: async (file) => uploadImageWithProgress(file),
      onToast,
    })
  );

  // extension debug (원하면 유지)
  useEffect(() => {
    if (!editor) return;
    const names = editor.extensionManager.extensions.map((e) => e.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    console.log("[UF] extensions:", names);
    console.log("[UF] dupes:", dupes);
  }, [editor]);

  // 업로드 이벤트(붙여넣기/드롭에서 url 전달받아 이미지 삽입)
  useEffect(() => {
    if (!editor) return;
    const handler = (e) => {
      const url = e.detail?.url;
      if (url) editor.chain().focus().setImage({ src: url }).run();
    };
    window.addEventListener("uf:insert-image", handler);
    return () => window.removeEventListener("uf:insert-image", handler);
  }, [editor]);

  // Draft hook
  const draftsApi = useDrafts({
    db,
    editor,
    isAdmin,
    onToast,
    navigate,
  });

  // editor update → dirty
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => draftsApi.setIsDirty(true);
    editor.on("update", onUpdate);
    return () => editor.off("update", onUpdate);
  }, [editor, draftsApi]);

  // autosave
  useEffect(() => {
    const cleanup = draftsApi.runAutosave({
      title,
      subtitle,
      category,
      cover,
      coverMedium,
      author: { name: user?.displayName || "Admin", email: user?.email || "" },
    });
    return typeof cleanup === "function" ? cleanup : undefined;
  }, [
    draftsApi,
    title,
    subtitle,
    category,
    cover,
    coverMedium,
    user?.displayName,
    user?.email,
  ]);

  if (!isAdmin) {
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
      {/* --- Sidebar --- */}
      <aside
        className={`lg:col-span-3 p-10 flex flex-col gap-10 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto transition-colors ${
          isDarkMode
            ? "bg-zinc-900 border-zinc-800 shadow-2xl"
            : "bg-white border-zinc-50 shadow-xl"
        }`}
      >
        {/* Draft list */}
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

        {/* Meta */}
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

          {/* ✅ Cover Upload + URL inputs */}
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

        {/* Actions */}
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
                  author: {
                    name: user?.displayName || "Admin",
                    email: user?.email || "",
                  },
                }
              )
            }
            disabled={draftsApi.isSaving || draftsApi.isDraftLoading}
            className={`w-full py-5 font-black uppercase tracking-[0.5em] text-[10px] flex items-center justify-center gap-3 transition-all hover:opacity-70 rounded-2xl ${
              isDarkMode
                ? "bg-zinc-800 text-zinc-300"
                : "bg-zinc-50 text-zinc-500"
            }`}
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
                author: {
                  name: user?.displayName || "Admin",
                  email: user?.email || "",
                },
              })
            }
            disabled={draftsApi.isSaving || draftsApi.isDraftLoading}
            className="w-full py-5 bg-[#004aad] text-white font-black uppercase tracking-[0.5em] text-[10px] flex items-center justify-center gap-3 hover:bg-black shadow-xl transition-all rounded-2xl italic"
          >
            <Send size={14} /> {draftsApi.isSaving ? "PUBLISHING..." : "Publish Issue"}
          </button>
        </div>
      </aside>

      {/* --- Main --- */}
      <main className={`lg:col-span-9 flex transition-colors duration-500 ${isDarkMode ? "bg-black" : "bg-white"}`}>
        <div className="flex-1 flex flex-col">
          <EditorToolbar editor={editor} isDarkMode={isDarkMode} onToast={onToast} />
          <div className="grow p-12 md:p-32 overflow-y-auto">

          <div className="max-w-4xl mx-auto space-y-16">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="ENTER TITLE..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  draftsApi.setIsDirty(true);
                }}
                className={`w-full text-7xl font-black italic tracking-tighter focus:outline-none bg-transparent placeholder:text-zinc-100 dark:placeholder:text-zinc-900 ${
                  isDarkMode ? "text-white" : "text-black"
                }`}
              />
              <div className="h-2 w-24 bg-[#004aad] shadow-[0_0_15px_#004aad]" />
            </div>

            <input
              type="text"
              placeholder="Subtitle here..."
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value);
                draftsApi.setIsDirty(true);
              }}
              className={`w-full text-2xl font-light italic focus:outline-none bg-transparent border-l-4 border-[#004aad] pl-8 ${
                isDarkMode ? "text-zinc-500" : "text-zinc-400"
              }`}
            />

            <div className="editor-container relative">
              <SlashMenu pos={slashPos} onClose={closeSlashMenu} editor={editor} />

              <EditorContent
                editor={editor}
                onKeyDown={(e) => onEditorKeyDown(editor, e)}
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

      {/* ✅ Editor-only inline styles (View 영향 X) */}
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        /* ✅ 오타 수정: .ProseMirror.uf-editor */
        .ProseMirror.uf-editor { min-height: 500px; outline: none; }

        /* Editor-only block UX (ViewPage에 영향 0) */
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
      `}</style>
    </div>
  );
}