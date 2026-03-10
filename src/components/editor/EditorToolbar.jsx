import React, { useEffect, useState } from "react";
import { useEditorState } from "@tiptap/react";
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
  Music,
  Mic,
  Table as TableIcon,
  Vote,
  Highlighter,
  Eraser,
  Type,
  Palette,
} from "lucide-react";

import UploadButton from "./UploadButton";
import { useUploadImage } from "../../hooks/useUploadImage";
import { toEmbedURL, defaultEmbedHeight } from "../../lib/ufEmbed";

const FONT_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Pretendard", value: "Pretendard, system-ui, sans-serif" },
  { label: "Noto Serif KR", value: '"Noto Serif KR", serif' },
  { label: "Cormorant Garamond", value: '"Cormorant Garamond", serif' },
  { label: "Georgia", value: "Georgia, serif" },
];

const FONT_SIZE_OPTIONS = [
  { label: "Default", value: "" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "40", value: "40px" },
];

const HIGHLIGHT_PRESETS = ["#fff59d", "#ffd6e7", "#c7f9cc", "#bde0fe", "#e9d5ff"];
const inputWrapCls =
  "flex items-center gap-2 h-9 rounded-lg bg-white dark:bg-zinc-800 px-3 text-[11px] font-black italic text-zinc-600 dark:text-zinc-200";

const numberInputCls =
  "w-16 bg-transparent border-0 outline-none text-[11px] font-black italic text-zinc-700 dark:text-zinc-100";

function normalizeColorToHex(value, fallback = "#111111") {
  if (!value) return fallback;
  if (value.startsWith("#")) {
    if (value.length === 4) {
      return (
        "#" +
        value[1] +
        value[1] +
        value[2] +
        value[2] +
        value[3] +
        value[3]
      ).toLowerCase();
    }
    return value.toLowerCase();
  }

  const rgb = value.match(/\d+/g);
  if (!rgb || rgb.length < 3) return fallback;

  const [r, g, b] = rgb.slice(0, 3).map(Number);
  return (
    "#" +
    [r, g, b]
      .map((n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join("")
  ).toLowerCase();
}

export default function EditorToolbar({ editor, isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { upload, uploading, progress } = useUploadImage();

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) {
        return {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          codeBlock: false,
          h1: false,
          h2: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          taskList: false,
          alignLeft: false,
          alignCenter: false,
          alignRight: false,
          alignJustify: false,
          link: false,
          table: false,
          fontFamily: "",
          fontSize: "",
          letterSpacing: "0",
          lineHeight: "36",
          textColor: "#111111",
          highlightColor: "#fff59d",
        };
      }

      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        codeBlock: editor.isActive("codeBlock"),
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        blockquote: editor.isActive("blockquote"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        taskList: editor.isActive("taskList"),
        alignLeft: editor.isActive({ textAlign: "left" }),
        alignCenter: editor.isActive({ textAlign: "center" }),
        alignRight: editor.isActive({ textAlign: "right" }),
        alignJustify: editor.isActive({ textAlign: "justify" }),
        link: editor.isActive("link"),
        table: editor.isActive("table"),
        fontFamily: editor.getAttributes("textStyle").fontFamily || "",
        fontSize: editor.getAttributes("textStyle").fontSize || "",
        letterSpacing: String(
          parseInt(editor.getAttributes("textStyle").letterSpacing || "0", 10) || 0
        ),
        lineHeight: String(
          parseInt(
            editor.getAttributes("paragraph").lineHeight ||
              editor.getAttributes("heading").lineHeight ||
              "36",
            10
          ) || 36
        ),
        textColor: normalizeColorToHex(editor.getAttributes("textStyle").color, "#111111"),
        highlightColor: normalizeColorToHex(editor.getAttributes("highlight").color, "#fff59d"),
      };
    },
  });

  const [textColor, setTextColor] = useState("#111111");
  const [highlightColor, setHighlightColor] = useState("#fff59d");

  useEffect(() => {
    setTextColor(editorState.textColor || "#111111");
  }, [editorState.textColor]);

  useEffect(() => {
    setHighlightColor(editorState.highlightColor || "#fff59d");
  }, [editorState.highlightColor]);

  const btn = (active) =>
    `p-2 rounded-lg transition ${
      active
        ? "bg-[#004aad] text-white"
        : "text-zinc-400 hover:bg-white dark:hover:bg-zinc-800"
    }`;

  const group = "flex bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded-xl gap-1 flex-wrap items-center";
  const selectCls =
    "h-9 rounded-lg border-0 bg-white dark:bg-zinc-800 px-3 text-[11px] font-black italic text-zinc-600 dark:text-zinc-200 focus:outline-none";
  const swatchBtn = (active) =>
    `w-8 h-8 rounded-lg border transition ${active ? "ring-2 ring-[#004aad] border-[#004aad]" : "border-zinc-200 dark:border-zinc-700"}`;

  if (!editor) return null;

  const inTable = editorState.table;

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
      console.error(e);
      toast("이미지 업로드 실패");
    }
  };

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
      console.error(e);
      toast("패럴랙스 업로드 실패");
    }
  };

  const uploadStickyImage = async (file) => {
    try {
      const { url } = await upload(file, { variant: "sticky" });
      editor
        .chain()
        .focus()
        .insertContent({
          type: "stickyStory",
          attrs: { imageSrc: url, imagePos: "left", stickyHeight: "100vh" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Sticky story text..." }] }],
        })
        .run();
    } catch (e) {
      console.error(e);
      toast("스티키 업로드 실패");
    }
  };

  const insertPoll = () => {
    if (editor?.commands?.insertUfPoll) {
      editor.chain().focus().insertUfPoll().run();
    } else {
      toast("Poll 커맨드가 아직 연결되지 않았어요.");
    }
  };

  const insertEmbed = (kind) => {
    const theme = isDarkMode ? "1" : "0";
    const placeholder =
      kind === "podcast"
        ? "https://open.spotify.com/show/"
        : "https://open.spotify.com/playlist/";

    const url = window.prompt(
      kind === "podcast"
        ? "Podcast URL (Spotify show/episode)"
        : "Playlist URL (Spotify playlist)",
      placeholder
    );

    if (url === null) return;

    const r = url ? toEmbedURL(kind, url, { theme }) : null;

    if (url && !r?.ok) {
      toast("지원되지 않는 링크예요. (현재 Spotify 링크 권장)");
    }

    const nodeType = kind === "podcast" ? "ufPodcast" : "ufPlaylist";

    editor
      .chain()
      .focus()
      .insertContent({
        type: nodeType,
        attrs: {
          kind,
          url: url || "",
          embedUrl: r?.ok ? r.embedUrl : "",
          height: defaultEmbedHeight(kind),
          theme,
        },
      })
      .run();
  };

  return (
    <div
      className={`p-6 border-b flex flex-wrap gap-4 items-center sticky top-[80px] z-30 backdrop-blur-3xl transition-colors ${
        isDarkMode ? "bg-black/90 border-zinc-900" : "bg-white/90 border-zinc-50"
      }`}
    >
      <div className={group}>
        <Type size={16} className="text-zinc-400 ml-1" />

        <select
          value={editorState.fontFamily}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              editor.chain().focus().unsetFontFamily().run();
              return;
            }
            editor.chain().focus().setFontFamily(v).run();
          }}
          className={selectCls}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={editorState.fontSize}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              editor.chain().focus().unsetFontSize().run();
              return;
            }
            editor.chain().focus().setFontSize(v).run();
          }}
          className={selectCls}
        >
          {FONT_SIZE_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <div className={inputWrapCls}>
          <span>Tracking</span>
          <input
            type="number"
            step="1"
            value={editorState.letterSpacing}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || Number(v) === 0) {
                editor.chain().focus().unsetLetterSpacing().run();
                return;
              }
              editor.chain().focus().setLetterSpacing(`${v}px`).run();
            }}
            className={numberInputCls}
          />
          <span>px</span>
        </div>

        <div className={inputWrapCls}>
          <span>Leading</span>
          <input
            type="number"
            step="1"
            min="1"
            value={editorState.lineHeight}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                editor.chain().focus().unsetLineHeight().run();
                return;
              }
              editor.chain().focus().setLineHeight(`${v}px`).run();
            }}
            className={numberInputCls}
          />
          <span>px</span>
        </div>
      </div>

      <div className={group}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editorState.bold)} title="Bold" type="button">
          <Bold size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editorState.italic)} title="Italic" type="button">
          <Italic size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editorState.underline)} title="Underline" type="button">
          <UnderlineIcon size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editorState.strike)} title="Strike" type="button">
          <Strikethrough size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editorState.codeBlock)} title="Code Block" type="button">
          <Code size={18} />
        </button>
      </div>

      <div className={group}>
        <Palette size={16} className="text-zinc-400 ml-1" />

        <input
          type="color"
          value={textColor}
          onChange={(e) => {
            const value = e.target.value;
            setTextColor(value);
            editor.chain().focus().setColor(value).run();
          }}
          className="w-9 h-9 rounded-lg overflow-hidden bg-transparent border-0 p-0"
          title="Text Color"
        />

        <button onClick={() => editor.chain().focus().unsetColor().run()} className={btn(false)} title="Clear Text Color" type="button">
          <Eraser size={16} />
        </button>
      </div>

      <div className={group}>
        <Highlighter size={16} className="text-zinc-400 ml-1" />

        {HIGHLIGHT_PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
            className={swatchBtn(editor.isActive("highlight", { color }))}
            style={{ backgroundColor: color }}
            title={`Highlight ${color}`}
            type="button"
          />
        ))}

        <input
          type="color"
          value={highlightColor}
          onChange={(e) => {
            const value = e.target.value;
            setHighlightColor(value);
            editor.chain().focus().setHighlight({ color: value }).run();
          }}
          className="w-9 h-9 rounded-lg overflow-hidden bg-transparent border-0 p-0"
          title="Custom Highlight"
        />

        <button onClick={() => editor.chain().focus().unsetHighlight().run()} className={btn(false)} title="Clear Highlight" type="button">
          <Eraser size={16} />
        </button>
      </div>

      <div className={group}>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editorState.h1)} title="H1" type="button">
          <Heading1 size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editorState.h2)} title="H2" type="button">
          <Heading2 size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editorState.blockquote)} title="Quote" type="button">
          <Quote size={18} />
        </button>
      </div>

      <div className={group}>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editorState.bulletList)} title="Bullets" type="button">
          <List size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editorState.orderedList)} title="Numbered" type="button">
          <ListOrdered size={18} />
        </button>

        <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editorState.taskList)} title="Tasks" type="button">
          <CheckSquare size={18} />
        </button>
      </div>

      <div className={group}>
        <button onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editorState.alignLeft)} title="Align Left" type="button">
          <AlignLeft size={18} />
        </button>

        <button onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editorState.alignCenter)} title="Align Center" type="button">
          <AlignCenter size={18} />
        </button>

        <button onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editorState.alignRight)} title="Align Right" type="button">
          <AlignRight size={18} />
        </button>

        <button onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btn(editorState.alignJustify)} title="Justify" type="button">
          <AlignJustify size={18} />
        </button>
      </div>

      <div className={group}>
        <button onClick={insertLink} className={btn(editorState.link)} title="Insert/Edit Link" type="button">
          <Link2 size={18} />
        </button>

        <button onClick={() => editor.chain().focus().unsetLink().run()} className={btn(false)} title="Remove Link" type="button">
          <Unlink size={18} />
        </button>

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

        <button onClick={() => insertEmbed("playlist")} className={btn(false)} title="Insert Playlist" type="button">
          <Music size={18} />
        </button>

        <button onClick={() => insertEmbed("podcast")} className={btn(false)} title="Insert Podcast" type="button">
          <Mic size={18} />
        </button>

        <button onClick={insertPoll} className={btn(false)} title="Insert Poll" type="button">
          <Vote size={18} />
        </button>

        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={btn(editorState.table)}
          title="Insert Table"
          type="button"
        >
          <TableIcon size={18} />
        </button>
      </div>

      <div className={group}>
        <button onClick={() => editor.chain().focus().addRowBefore().run()} className={btn(false)} title="Add Row Above" disabled={!inTable} type="button">
          <PlusSquare size={18} />
        </button>

        <button onClick={() => editor.chain().focus().addRowAfter().run()} className={btn(false)} title="Add Row Below" disabled={!inTable} type="button">
          <PlusSquare size={18} className="rotate-90" />
        </button>

        <button onClick={() => editor.chain().focus().deleteRow().run()} className={btn(false)} title="Delete Row" disabled={!inTable} type="button">
          <MinusSquare size={18} />
        </button>

        <button onClick={() => editor.chain().focus().addColumnBefore().run()} className={btn(false)} title="Add Column Left" disabled={!inTable} type="button">
          <Columns2 size={18} />
        </button>

        <button onClick={() => editor.chain().focus().addColumnAfter().run()} className={btn(false)} title="Add Column Right" disabled={!inTable} type="button">
          <Columns2 size={18} className="rotate-180" />
        </button>

        <button onClick={() => editor.chain().focus().deleteColumn().run()} className={btn(false)} title="Delete Column" disabled={!inTable} type="button">
          <MinusSquare size={18} className="rotate-90" />
        </button>
      </div>

      <div className={group}>
        <button onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="Undo" type="button">
          <Undo2 size={18} />
        </button>

        <button onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="Redo" type="button">
          <Redo2 size={18} />
        </button>
      </div>
    </div>
  );
}