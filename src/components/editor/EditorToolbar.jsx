import React from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Code,
  Undo2,
  Redo2,
  Link2,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Layers,
  Sticker,
  PlusSquare,
  MinusSquare,
  Columns2,
  CheckSquare,
  Table as TableIcon,
  Vote,
} from "lucide-react";

import UploadButton from "./UploadButton";
import { useUploadImage } from "../../hooks/useUploadImage";

export default function EditorToolbar({ editor, isDarkMode, onToast }) {
  const { upload, uploading, progress } = useUploadImage();

  if (!editor) return null;

  const btn = (active) =>
    `p-2 rounded-lg transition ${
      active ? "bg-[#004aad] text-white" : "text-zinc-400 hover:bg-white dark:hover:bg-zinc-800"
    }`;

  const group = "flex bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded-xl gap-1 flex-wrap";

  const insertLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  // ✅ 단일 이미지 업로드 → ufImage 노드로 삽입(Inspector가 잡힘)
  const uploadInlineImage = async (file) => {
   try {
      const { url } = await upload(file, { variant: "inline" });

      editor
        .chain()
        .focus()
        .insertContent({
          type: "ufImage",
          attrs: {
            src: url,
            alt: "",
            caption: "",
            size: "normal",
            align: "center",
          },
        })
        .run();
    } catch (e) {
      onToast?.("이미지 업로드 실패");
    }
  };

  // ✅ Parallax 업로드 → 바로 삽입
  const uploadParallaxImage = async (file) => {
    try {
      const { url } = await upload(file, { variant: "parallax" });
      editor
        .chain()
        .focus()
        .insertContent({
          type: "parallaxImage",
          attrs: { src: url, caption: "", speed: 0.2, height: "70vh", bleed: true },
        })
        .run();
    } catch (e) {
      onToast?.("패럴랙스 업로드 실패");
    }
  };

  // ✅ Sticky 업로드 → 바로 삽입
  const uploadStickyImage = async (file) => {
    try {
      const { url } = await upload(file, { variant: "sticky" });
      editor
        .chain()
        .focus()
        .insertContent({
          type: "stickyStory",
          attrs: { imageSrc: url, imagePos: "left", stickyHeight: "100vh" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Sticky story text..." }] },
          ],
        })
        .run();
    } catch (e) {
      onToast?.("스티키 업로드 실패");
    }
  };

  const insertPoll = () => {
    if (editor?.commands?.insertUfPoll) {
      editor.chain().focus().insertUfPoll().run();
    } else {
      onToast?.("Poll 커맨드가 아직 연결되지 않았어요.");
    }
  };

  const inTable = editor.isActive("table");

  return (
    <div
      className={`p-6 border-b flex flex-wrap gap-4 items-center sticky top-[80px] z-30 backdrop-blur-3xl transition-colors ${
        isDarkMode ? "bg-black/90 border-zinc-900" : "bg-white/90 border-zinc-50"
      }`}
    >
      {/* Text */}
      <div className={group}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Bold">
          <Bold size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Italic">
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btn(editor.isActive("underline"))}
          title="Underline"
        >
          <UnderlineIcon size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title="Strike">
          <Strikethrough size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={btn(editor.isActive("codeBlock"))}
          title="Code Block"
        >
          <Code size={18} />
        </button>
      </div>

      {/* Headings */}
      <div className={group}>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btn(editor.isActive("heading", { level: 1 }))}
          title="H1"
        >
          <Heading1 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive("heading", { level: 2 }))}
          title="H2"
        >
          <Heading2 size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="Quote">
          <Quote size={18} />
        </button>
      </div>

      {/* Lists */}
      <div className={group}>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="Bullets">
          <List size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="Numbered">
          <ListOrdered size={18} />
        </button>
        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive("taskList"))} title="Tasks">
          <CheckSquare size={18} />
        </button>
      </div>

      {/* Align */}
      <div className={group}>
        <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))} title="Align Left">
          <AlignLeft size={18} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))} title="Align Center">
          <AlignCenter size={18} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))} title="Align Right">
          <AlignRight size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={btn(editor.isActive({ textAlign: "justify" }))}
          title="Justify"
        >
          <AlignJustify size={18} />
        </button>
      </div>

      {/* Insert + Uploads */}
      <div className={group}>
        <button onClick={insertLink} className={btn(editor.isActive("link"))} title="Insert/Edit Link">
          <Link2 size={18} />
        </button>
        <button onClick={() => editor.chain().focus().unsetLink().run()} className={btn(false)} title="Remove Link">
          <Unlink size={18} />
        </button>

        {/* ✅ 업로드 버튼들(진행률 공유) */}
        <UploadButton
          label="Image"
          title="Upload Image"
          uploading={uploading}
          progress={progress}
          onPickFile={uploadInlineImage}
        />
        <UploadButton
          label="Parallax"
          title="Upload Parallax Image"
          uploading={uploading}
          progress={progress}
          onPickFile={uploadParallaxImage}
          icon={Layers}
        />
        <UploadButton
          label="Sticky"
          title="Upload Sticky Image"
          uploading={uploading}
          progress={progress}
          onPickFile={uploadStickyImage}
          icon={Sticker}
        />

        <button onClick={insertPoll} className={btn(false)} title="Insert Poll">
          <Vote size={18} />
        </button>

        {/* ✅ TipTap Table */}
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={btn(editor.isActive("table"))}
          title="Insert Table"
        >
          <TableIcon size={18} />
        </button>
      </div>

      {/* Table controls */}
      <div className={group}>
        <button onClick={() => editor.chain().focus().addRowBefore().run()} className={btn(false)} title="Add Row Above" disabled={!inTable}>
          <PlusSquare size={18} />
        </button>
        <button onClick={() => editor.chain().focus().addRowAfter().run()} className={btn(false)} title="Add Row Below" disabled={!inTable}>
          <PlusSquare size={18} className="rotate-90" />
        </button>
        <button onClick={() => editor.chain().focus().deleteRow().run()} className={btn(false)} title="Delete Row" disabled={!inTable}>
          <MinusSquare size={18} />
        </button>

        <button onClick={() => editor.chain().focus().addColumnBefore().run()} className={btn(false)} title="Add Column Left" disabled={!inTable}>
          <Columns2 size={18} />
        </button>
        <button onClick={() => editor.chain().focus().addColumnAfter().run()} className={btn(false)} title="Add Column Right" disabled={!inTable}>
          <Columns2 size={18} className="rotate-180" />
        </button>
        <button onClick={() => editor.chain().focus().deleteColumn().run()} className={btn(false)} title="Delete Column" disabled={!inTable}>
          <MinusSquare size={18} className="rotate-90" />
        </button>
      </div>

      {/* History */}
      <div className={group}>
        <button onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="Undo">
          <Undo2 size={18} />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="Redo">
          <Redo2 size={18} />
        </button>
      </div>
    </div>
  );
}