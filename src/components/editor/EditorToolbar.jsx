import React, { useCallback, useState } from "react";
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
import { requestEditorInput, withLinkScheme } from "../../lib/editorInput";
import { askEmbedUrl } from "../../lib/editorPrompts";
import { isPublicationLinkValid } from "../../lib/publicationChecks";
import {
  getParallaxMotionSpeed,
  PARALLAX_DEFAULTS,
  STICKY_STORY_DEFAULTS,
} from "../../constants/editorBlocks";

const FONT_OPTIONS = [
  { label: "기본", value: "" },
  { label: "Pretendard", value: "Pretendard, system-ui, sans-serif" },
  { label: "Noto Serif KR", value: '"Noto Serif KR", serif' },
  { label: "Cormorant", value: '"Cormorant Garamond", serif' },
  { label: "Georgia", value: "Georgia, serif" },
];

const FONT_SIZE_OPTIONS = [
  { label: "기본", value: "" },
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
        "min-w-0 px-1 py-1",
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
      <div className="sr-only">
        {title}
      </div>
      <div role="group" aria-label={title} className="flex flex-wrap items-center gap-1">{children}</div>
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
      onMouseDown={(event) => event.preventDefault()}
      title={title || label}
      aria-label={title || label}
      aria-pressed={active}
      type={type}
      disabled={disabled}
      className={[
        "h-9 min-w-9 rounded-md border flex items-center justify-center gap-1.5 text-xs font-medium transition shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004aad]",
        short ? "px-2" : "px-2.5",
        disabled
          ? "opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400"
          : active
          ? "bg-[#004aad] text-white border-[#004aad]"
          : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800",
        className,
      ].join(" ")}
    >
      <Icon size={16} aria-hidden="true" className={iconClassName} />
      {!short && <span>{label}</span>}
    </button>
  );
}

function ToolbarSelect({ value, onChange, children, isDarkMode, className = "", label }) {
  return (
    <select
      value={value}
      onChange={onChange}
      aria-label={label}
      title={label}
      className={[
        "h-9 rounded-md border px-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004aad] shrink-0 min-w-0",
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
        aria-label={label}
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

function ToolbarColors({ editor, isDarkMode, textColor, setTextColor, highlightColor, setHighlightColor }) {
  return (
    <ToolbarGroup title="색상" isDarkMode={isDarkMode}>
              <ColorSwatchGroup title="글자 색" icon={Palette} isDarkMode={isDarkMode}>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTextColor(value);
                    editor.chain().focus().setColor(value).run();
                  }}
                  className="w-8 h-8 rounded-lg overflow-hidden bg-transparent border-0 p-0"
                  title="글자 색" aria-label="글자 색"
                />
                <button
                  onClick={() => editor.chain().focus().unsetColor().run()}
                  className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-black italic bg-white dark:bg-zinc-900"
                  title="글자 색 지우기" aria-label="글자 색 지우기"
                  type="button"
                >
                  <Eraser size={12} />
                </button>
              </ColorSwatchGroup>

              <ColorSwatchGroup title="강조색" icon={Highlighter} isDarkMode={isDarkMode}>
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
                      title={`강조색 ${color}`} aria-label={`강조색 ${color}`} aria-pressed={editor.isActive("highlight", { color })}
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
                  title="사용자 지정 강조색" aria-label="사용자 지정 강조색"
                />

                <button
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-black italic bg-white dark:bg-zinc-900"
                  title="강조색 지우기" aria-label="강조색 지우기"
                  type="button"
                >
                  <Eraser size={12} />
                </button>
              </ColorSwatchGroup>
            </ToolbarGroup>
  );
}

export default function EditorToolbar({ editor, isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { upload, uploading, progress } = useUploadImage();

  const getSavedInsertPos = useCallback(() => {
    if (!editor) return null;
    return editor.state.selection.from;
  }, [editor]);

  const insertUploadedContent = useCallback(
    (savedPos, content) => {
      if (!editor) return false;

      const maxPos = editor.state.doc.content.size;
      const targetPos =
        typeof savedPos === "number" ? Math.max(0, Math.min(savedPos, maxPos)) : null;

      const chain = editor.chain().focus();

      if (typeof targetPos === "number") {
        chain.insertContentAt(targetPos, content);
      } else {
        chain.insertContent(content);
      }

      return chain.run();
    },
    [editor]
  );

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

  const currentTextColor = editorState.textColor || "#111111";
  const currentHighlightColor = editorState.highlightColor || "#fff59d";
  const [textColorDraft, setTextColorDraft] = useState({
    source: "#111111",
    value: "#111111",
  });
  const [highlightColorDraft, setHighlightColorDraft] = useState({
    source: "#fff59d",
    value: "#fff59d",
  });

  const textColor =
    textColorDraft.source === currentTextColor ? textColorDraft.value : currentTextColor;
  const highlightColor =
    highlightColorDraft.source === currentHighlightColor
      ? highlightColorDraft.value
      : currentHighlightColor;

  const setTextColor = (value) => {
    setTextColorDraft({ source: currentTextColor, value });
  };

  const setHighlightColor = (value) => {
    setHighlightColorDraft({ source: currentHighlightColor, value });
  };

  if (!editor) return null;

  const inTable = editorState.table;

  const insertLink = async () => {
    const prev = editor.getAttributes("link").href;
    const url = await requestEditorInput({
      title: prev ? "링크 수정" : "링크 넣기", label: "주소", defaultValue: prev || "", placeholder: "https://",
      inputMode: "url", allowEmpty: !!prev, confirmLabel: prev ? "바꾸기" : "넣기",
      hint: prev ? "주소를 지우고 확인하면 링크가 해제돼요." : "선택한 글자에 링크를 걸어요. example.com처럼 입력해도 돼요.",
      validate: (value) => (isPublicationLinkValid(withLinkScheme(value)) ? "" : "열 수 없는 주소예요. https://로 시작하는지 확인해 주세요."),
    });
    if (url === null || editor.isDestroyed) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: withLinkScheme(url) }).run();
  };

  const uploadInlineImage = async (file) => {
    const savedPos = getSavedInsertPos();

    try {
      const { url } = await upload(file, { variant: "inline" });
      insertUploadedContent(savedPos, {
          type: "ufImage",
          attrs: {
            src: url,
            alt: "",
            caption: "",
            size: "normal",
            align: "center",
          },
        });
    } catch (e) {
      console.error(e);
      toast(e?.userMessage || "이미지 업로드 실패");
    }
  };

  const uploadParallaxImage = async (file) => {
    const savedPos = getSavedInsertPos();

    try {
      const { url } = await upload(file, { variant: "parallax" });
      insertUploadedContent(savedPos, {
          type: "parallaxImage",
          attrs: {
            src: url,
            caption: "",
            ...PARALLAX_DEFAULTS,
            captionAlign: "center-bottom",
            captionSize: "normal",
            motionPreset: "soft",
            speed: getParallaxMotionSpeed("soft"),
          },
        });
    } catch (e) {
      console.error(e);
      toast(e?.userMessage || "패럴랙스 업로드 실패");
    }
  };

  const uploadStickyImage = async (file) => {
    const savedPos = getSavedInsertPos();

    try {
      const { url } = await upload(file, { variant: "sticky" });
      insertUploadedContent(savedPos, {
          type: "stickyStory",
          attrs: { imageSrc: url, ...STICKY_STORY_DEFAULTS },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Sticky story text..." }],
            },
          ],
        });
    } catch (e) {
      console.error(e);
      toast(e?.userMessage || "스티키 업로드 실패");
    }
  };

  const insertPoll = () => {
    if (editor?.commands?.insertUfPoll) {
      editor.chain().focus().insertUfPoll().run();
    } else {
      toast("Poll 커맨드가 아직 연결되지 않았어요.");
    }
  };

  const insertEmbed = async (kind) => {
    const theme = isDarkMode ? "1" : "0";
    const url = await askEmbedUrl(kind);
    if (!url || editor.isDestroyed) return;
    const r = toEmbedURL(kind, url, { theme });

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
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const openMenu = event.currentTarget.querySelector("details[open]");
        if (!openMenu) return;
        openMenu.open = false;
        openMenu.querySelector("summary")?.focus();
        event.stopPropagation();
      }}
      className={`uf-format-toolbar relative min-w-0 border-b transition-colors ${
        isDarkMode ? "bg-black/92 border-zinc-900" : "bg-white/92 border-zinc-100"
      }`}
    >
      <div className="px-2 sm:px-3 py-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <details name="uf-format-options" className="group">
            <summary className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004aad]">글꼴 · 색상</summary>
            <div className="absolute left-0 right-0 top-full z-10 max-h-[min(50vh,320px)] overflow-auto border-b border-zinc-200 bg-white p-3 shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <ToolbarGroup title="글꼴" isDarkMode={isDarkMode}>
              <ToolbarSelect
                label="글꼴"
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
                label="글자 크기"
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
                label="자간"
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
                label="줄 간격"
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
            <ToolbarColors editor={editor} isDarkMode={isDarkMode} textColor={textColor} setTextColor={setTextColor} highlightColor={highlightColor} setHighlightColor={setHighlightColor} />
            </div>
          </details>
          <div role="group" aria-label="기본 서식" tabIndex={0} className="order-first flex w-full min-w-0 items-center gap-2 overflow-x-auto py-1 [&>div]:shrink-0 [&>div>div]:flex-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004aad]">
            <ToolbarGroup title="서식" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={Bold}
                label="굵게"
                short
                active={editorState.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
              />
              <ToolbarIconButton
                icon={Italic}
                label="기울임"
                short
                active={editorState.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              />
              <ToolbarIconButton
                icon={UnderlineIcon}
                label="밑줄"
                short
                active={editorState.underline}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              />
              <ToolbarIconButton
                icon={Strikethrough}
                label="취소선"
                short
                active={editorState.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              />
              <ToolbarIconButton
                icon={Code}
                short
                label="코드 블록"
                active={editorState.codeBlock}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              />
            </ToolbarGroup>

            <ToolbarGroup title="문단" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={Heading1}
                short
                label="제목 1"
                active={editorState.h1}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              />
              <ToolbarIconButton
                icon={Heading2}
                short
                label="제목 2"
                active={editorState.h2}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              />
              <ToolbarIconButton
                icon={Quote}
                short
                label="인용"
                active={editorState.blockquote}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              />
              <ToolbarIconButton
                icon={List}
                short
                label="글머리 목록"
                active={editorState.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              />
              <ToolbarIconButton
                icon={ListOrdered}
                short
                label="번호 목록"
                active={editorState.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              />
              <ToolbarIconButton
                icon={CheckSquare}
                short
                label="체크 목록"
                active={editorState.taskList}
                onClick={() => editor.chain().focus().toggleTaskList().run()}
              />
            </ToolbarGroup>

            <ToolbarGroup title="정렬 및 링크" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={AlignLeft}
                label="왼쪽 정렬"
                short
                active={editorState.alignLeft}
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              />
              <ToolbarIconButton
                icon={AlignCenter}
                label="가운데 정렬"
                short
                active={editorState.alignCenter}
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
              />
              <ToolbarIconButton
                icon={AlignRight}
                label="오른쪽 정렬"
                short
                active={editorState.alignRight}
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
              />
              <ToolbarIconButton
                icon={AlignJustify}
                label="양쪽 정렬"
                short
                active={editorState.alignJustify}
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              />
              <ToolbarIconButton
                icon={Link2}
                short
                label="링크"
                active={editorState.link}
                onClick={insertLink}
              />
              <ToolbarIconButton
                icon={Unlink}
                short
                label="링크 해제"
                onClick={() => editor.chain().focus().unsetLink().run()}
              />
            </ToolbarGroup>
            <ToolbarGroup title="편집 기록" isDarkMode={isDarkMode}>
              <ToolbarIconButton
                icon={Undo2}
                short
                label="실행 취소"
                onClick={() => editor.chain().focus().undo().run()}
              />
              <ToolbarIconButton
                icon={Redo2}
                short
                label="다시 실행"
                onClick={() => editor.chain().focus().redo().run()}
              />
            </ToolbarGroup>
          </div>

          <details name="uf-format-options" className="group">
            <summary className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004aad]">블록 삽입 · 표</summary>
            <div className="absolute left-0 right-0 top-full z-10 flex flex-wrap gap-3 max-h-[min(50vh,320px)] overflow-auto border-b border-zinc-200 bg-white p-3 shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <ToolbarGroup title="블록 삽입" isDarkMode={isDarkMode}>
              <UploadButton
                label="이미지"
                title="이미지 업로드" aria-label="이미지 업로드"
                uploading={uploading}
                progress={progress}
                onPickFile={uploadInlineImage}
                icon={Image}
              />

              <UploadButton
                label="패럴랙스"
                title="패럴랙스 이미지 업로드" aria-label="패럴랙스 이미지 업로드"
                uploading={uploading}
                progress={progress}
                onPickFile={uploadParallaxImage}
                icon={Layers}
              />

              <UploadButton
                label="스티키 이미지"
                title="스티키 이미지 업로드" aria-label="스티키 이미지 업로드"
                uploading={uploading}
                progress={progress}
                onPickFile={uploadStickyImage}
                icon={Sticker}
              />

              <ToolbarIconButton
                icon={Music}
                label="플레이리스트"
                onClick={() => insertEmbed("playlist")}
              />

              <ToolbarIconButton
                icon={Mic}
                label="팟캐스트"
                onClick={() => insertEmbed("podcast")}
              />

              <ToolbarIconButton
                icon={Vote}
                label="투표"
                onClick={insertPoll}
              />

              <ToolbarIconButton
                icon={TableIcon}
                label="표"
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
              title="표 편집"
              isDarkMode={isDarkMode}
              active={inTable}
            >
              <ToolbarIconButton
                icon={PlusSquare}
                label="위에 행 추가"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().addRowBefore().run()}
              />
              <ToolbarIconButton
                icon={PlusSquare}
                label="아래에 행 추가"
                short
                disabled={!inTable}
                iconClassName="rotate-90"
                onClick={() => editor.chain().focus().addRowAfter().run()}
              />
              <ToolbarIconButton
                icon={MinusSquare}
                label="행 삭제"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().deleteRow().run()}
              />
              <ToolbarIconButton
                icon={Columns2}
                label="왼쪽에 열 추가"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              />
              <ToolbarIconButton
                icon={Columns2}
                label="오른쪽에 열 추가"
                short
                disabled={!inTable}
                iconClassName="rotate-180"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              />
              <ToolbarIconButton
                icon={MinusSquare}
                label="열 삭제"
                short
                disabled={!inTable}
                iconClassName="rotate-90"
                onClick={() => editor.chain().focus().deleteColumn().run()}
              />
              <ToolbarIconButton
                icon={Trash2}
                label="표 삭제"
                short
                disabled={!inTable}
                onClick={() => editor.chain().focus().deleteTable().run()}
              />
            </ToolbarGroup>


            </div>
          </details>
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
