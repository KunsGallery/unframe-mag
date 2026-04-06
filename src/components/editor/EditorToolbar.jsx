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
  Palette,
  Image,
  Trash2,
} from "lucide-react";

import UploadButton from "./UploadButton";
import { useUploadImage } from "../../hooks/useUploadImage";
import { toEmbedURL, defaultEmbedHeight } from "../../lib/ufEmbed";

const FONT_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Pretendard", value: "Pretendard, system-ui, sans-serif" },
  { label: "Noto Serif KR", value: '"Noto Serif KR", serif' },
  { label: "Cormorant", value: '"Cormorant Garamond", serif' },
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

function ToolbarGroup({ title, children, isDarkMode, active = false, compact = false }) {
  return (
    <div
      className={[
        "min-w-0 rounded-xl border px-2 py-2",
        active
          ? isDarkMode
            ? "border-[#004aad]/40 bg-[#004aad]/10"
            : "border-[#004aad]/20 bg-[#004aad]/5"
          : isDarkMode
          ? "border-zinc-900 bg-zinc-950/90"
          : "border-zinc-100 bg-zinc-50/90",
        compact ? "flex items-center gap-2" : "",
      ].join(" ")}
    >
      <div className="text-[9px] font-black tracking-[0.2em] uppercase italic text-zinc-400 mb-1.5">
        {title}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function ToolbarIconButton({
  icon: Icon,
  label,
  active = false,
  onClick,
  title,
  type = "button",
  disabled = false,
  className = "",
  iconClassName = "",
  short = false,
}) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      type={type}
      disabled={disabled}
      className={[
        "h-8 rounded-lg border flex items-center gap-1.5 text-[10px] font-black italic transition shrink-0",
        short ? "px-2" : "px-2.5",
        disabled
          ? "opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400"
          : active
          ? "bg-[#004aad] text-white border-[#004aad]"
          : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800",
        className,
      ].join(" ")}
    >
      <Icon size={13} className={iconClassName} />
      {!short && <span>{label}</span>}
    </button>
  );
}

function ToolbarSelect({ value, onChange, children, isDarkMode, className = "" }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={[
        "h-8 rounded-lg border px-2 text-[10px] font-black italic focus:outline-none shrink-0 min-w-0",
        isDarkMode
          ? "border-zinc-800 bg-zinc-900 text-zinc-100"
          : "border-zinc-200 bg-white text-zinc-700",
        className,
      ].join(" ")}
    >
      {children}
    </select>
  );
}

function ToolbarNumberField({
  label,
  value,
  onChange,
  suffix,
  isDarkMode,
  min,
  step = "1",
}) {
  return (
    <div
      className={[
        "h-8 rounded-lg border px-2 flex items-center gap-1 text-[10px] font-black italic shrink-0",
        isDarkMode
          ? "border-zinc-800 bg-zinc-900 text-zinc-100"
          : "border-zinc-200 bg-white text-zinc-700",
      ].join(" ")}
    >
      <span className="text-zinc-400 whitespace-nowrap">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={onChange}
        className="w-9 bg-transparent border-0 outline-none"
      />
      <span className="text-zinc-400">{suffix}</span>
    </div>
  );
}

function ColorSwatchGroup({ title, icon: Icon, children, isDarkMode }) {
  return (
    <div
      className={[
        "rounded-lg border px-2 py-1.5 flex items-center gap-2 shrink-0",
        isDarkMode
          ? "border-zinc-800 bg-zinc-900"
          : "border-zinc-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-1 text-[10px] font-black italic text-zinc-400 shrink-0">
        <Icon size={12} />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
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
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Sticky story text..." }],
            },
          ],
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
      className={`border-b sticky top-[80px] z-30 backdrop-blur-3xl transition-colors ${
        isDarkMode ? "bg-black/92 border-zinc-900" : "bg-white/92 border-zinc-100"
      }`}
    >
      <div className="px-3 sm:px-4 py-2 space-y-2">
        <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1.45fr] gap-2">
          <div className="min-w-0 flex flex-wrap gap-2 items-start">
            <ToolbarGroup title="Type" isDarkMode={isDarkMode}>
              <ToolbarSelect
                value={editorState.fontFamily}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    editor.chain().focus().unsetFontFamily().run();
                    return;
                  }
                  editor.chain().focus().setFontFamily(v).run();
                }}
                isDarkMode={isDarkMode}
                className="w-[116px]"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.label} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </ToolbarSelect>

              <ToolbarSelect
                value={editorState.fontSize}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    editor.chain().focus().unsetFontSize().run();
                    return;
                  }
                  editor.chain().focus().setFontSize(v).run();
                }}
                isDarkMode={isDarkMode}
                className="w-[80px]"
              >
                {FONT_SIZE_OPTIONS.map((f) => (
                  <option key={f.label} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </ToolbarSelect>

              <ToolbarNumberField
                label="Tr"
                value={editorState.letterSpacing}
                suffix="px"
                isDarkMode={isDarkMode}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || Number(v) === 0) {
                    editor.chain().focus().unsetLetterSpacing().run();
                    return;
                  }
                  editor.chain().focus().setLetterSpacing(`${v}px`).run();
                }}
              />

              <ToolbarNumberField
                label="Ld"
                value={editorState.lineHeight}
                suffix="px"
                min="1"
                isDarkMode={isDarkMode}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    editor.chain().focus().unsetLineHeight().run();
                    return;
                  }
                  editor.chain().focus().setLineHeight(`${v}px`).run();
                }}
              />
            </ToolbarGroup>

            <ToolbarGroup title="Format" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={Bold}
                label="B"
                short
                active={editorState.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
              />
              <ToolbarIconButton
                icon={Italic}
                label="I"
                short
                active={editorState.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              />
              <ToolbarIconButton
                icon={UnderlineIcon}
                label="U"
                short
                active={editorState.underline}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              />
              <ToolbarIconButton
                icon={Strikethrough}
                label="S"
                short
                active={editorState.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              />
              <ToolbarIconButton
                icon={Code}
                label="Code"
                active={editorState.codeBlock}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              />
            </ToolbarGroup>

            <ToolbarGroup title="Structure" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={Heading1}
                label="H1"
                active={editorState.h1}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              />
              <ToolbarIconButton
                icon={Heading2}
                label="H2"
                active={editorState.h2}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              />
              <ToolbarIconButton
                icon={Quote}
                label="Quote"
                active={editorState.blockquote}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              />
              <ToolbarIconButton
                icon={List}
                label="List"
                active={editorState.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              />
              <ToolbarIconButton
                icon={ListOrdered}
                label="Num"
                active={editorState.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              />
              <ToolbarIconButton
                icon={CheckSquare}
                label="Task"
                active={editorState.taskList}
                onClick={() => editor.chain().focus().toggleTaskList().run()}
              />
            </ToolbarGroup>

            <ToolbarGroup title="Align / Link" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={AlignLeft}
                label="L"
                short
                active={editorState.alignLeft}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              />
              <ToolbarIconButton
                icon={AlignCenter}
                label="C"
                short
                active={editorState.alignCenter}
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
              />
              <ToolbarIconButton
                icon={AlignRight}
                label="R"
                short
                active={editorState.alignRight}
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
              />
              <ToolbarIconButton
                icon={AlignJustify}
                label="J"
                short
                active={editorState.alignJustify}
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              />
              <ToolbarIconButton
                icon={Link2}
                label="Link"
                active={editorState.link}
                onClick={insertLink}
              />
              <ToolbarIconButton
                icon={Unlink}
                label="Unlink"
                onClick={() => editor.chain().focus().unsetLink().run()}
              />
            </ToolbarGroup>
          </div>

          <div className="min-w-0 flex flex-wrap gap-2 items-start xl:justify-end">
            <ToolbarGroup title="Color" isDarkMode={isDarkMode}>
              <ColorSwatchGroup title="Text" icon={Palette} isDarkMode={isDarkMode}>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTextColor(value);
                    editor.chain().focus().setColor(value).run();
                  }}
                  className="w-8 h-8 rounded-lg overflow-hidden bg-transparent border-0 p-0"
                  title="Text Color"
                />
                <button
                  onClick={() => editor.chain().focus().unsetColor().run()}
                  className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-black italic bg-white dark:bg-zinc-900"
                  title="Clear Text Color"
                  type="button"
                >
                  <Eraser size={12} />
                </button>
              </ColorSwatchGroup>

              <ColorSwatchGroup title="Hi" icon={Highlighter} isDarkMode={isDarkMode}>
                <div className="flex items-center gap-1">
                  {HIGHLIGHT_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                      className={`w-6 h-6 rounded-md border transition ${
                        editor.isActive("highlight", { color })
                          ? "ring-2 ring-[#004aad] border-[#004aad]"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Highlight ${color}`}
                      type="button"
                    />
                  ))}
                </div>

                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    setHighlightColor(value);
                    editor.chain().focus().setHighlight({ color: value }).run();
                  }}
                  className="w-8 h-8 rounded-lg overflow-hidden bg-transparent border-0 p-0"
                  title="Custom Highlight"
                />

                <button
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-black italic bg-white dark:bg-zinc-900"
                  title="Clear Highlight"
                  type="button"
                >
                  <Eraser size={12} />
                </button>
              </ColorSwatchGroup>
            </ToolbarGroup>

            <ToolbarGroup title="Insert" isDarkMode={isDarkMode}>
              <UploadButton
                label="Img"
                title="Upload Image"
                uploading={uploading}
                progress={progress}
                onPickFile={uploadInlineImage}
                icon={Image}
              />

              <UploadButton
                label="Para"
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

              <ToolbarIconButton
                icon={Music}
                label="Play"
                onClick={() => insertEmbed("playlist")}
              />

              <ToolbarIconButton
                icon={Mic}
                label="Pod"
                onClick={() => insertEmbed("podcast")}
              />

              <ToolbarIconButton
                icon={Vote}
                label="Poll"
                onClick={insertPoll}
              />

              <ToolbarIconButton
                icon={TableIcon}
                label="Table"
                active={editorState.table}
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
              />
            </ToolbarGroup>

            <ToolbarGroup
              title="Table"
              isDarkMode={isDarkMode}
              active={inTable}
            >
              <ToolbarIconButton
                icon={PlusSquare}
                label="R+"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().addRowBefore().run()}
              />
              <ToolbarIconButton
                icon={PlusSquare}
                label="R↓"
                short
                disabled={!inTable}
                iconClassName="rotate-90"
                onClick={() => editor.chain().focus().addRowAfter().run()}
              />
              <ToolbarIconButton
                icon={MinusSquare}
                label="R-"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().deleteRow().run()}
              />
              <ToolbarIconButton
                icon={Columns2}
                label="C+"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              />
              <ToolbarIconButton
                icon={Columns2}
                label="C→"
                short
                disabled={!inTable}
                iconClassName="rotate-180"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              />
              <ToolbarIconButton
                icon={MinusSquare}
                label="C-"
                short
                disabled={!inTable}
                iconClassName="rotate-90"
                onClick={() => editor.chain().focus().deleteColumn().run()}
              />
              <ToolbarIconButton
                icon={Trash2}
                label="Del"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().deleteTable().run()}
              />
            </ToolbarGroup>

            <ToolbarGroup title="History" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={Undo2}
                label="Undo"
                onClick={() => editor.chain().focus().undo().run()}
              />
              <ToolbarIconButton
                icon={Redo2}
                label="Redo"
                onClick={() => editor.chain().focus().redo().run()}
              />
            </ToolbarGroup>
          </div>
        </div>

        {uploading && (
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-[#004aad] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}