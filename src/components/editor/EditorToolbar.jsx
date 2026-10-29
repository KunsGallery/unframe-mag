import React, { useCallback } from "react";
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
  Image,
  Trash2,
  Eraser,
  Paintbrush,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  CaseSensitive,
} from "lucide-react";

import UploadButton from "./UploadButton";
import { HighlightPopover, TextColorPopover, TextPresetPopover, TextSizeStepper } from "./TextFormatControls";
import { useTextFormatState } from "../../hooks/useTextFormatState";
import { useFormatPainter } from "../../hooks/useFormatPainter";
import { clearFormatting } from "../../lib/textFormatting";
import { useUploadImage } from "../../hooks/useUploadImage";
import { toEmbedURL, defaultEmbedHeight } from "../../lib/ufEmbed";
import { askEmbedUrl, editLink } from "../../lib/editorPrompts";
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

export default function EditorToolbar({ editor, isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { upload, uploading, progress } = useUploadImage();
  const format = useTextFormatState(editor);
  const painter = useFormatPainter(editor);

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
          letterSpacing: "0",
          lineHeight: "36",
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
      };
    },
  });

  if (!editor) return null;

  const inTable = editorState.table;

  const insertLink = () => editLink(editor);

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
            <summary className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004aad]">세부 서식</summary>
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

            <ToolbarGroup title="글자" isDarkMode={isDarkMode}>
              <div className="uf-toolbar-format">
                <TextSizeStepper editor={editor} fontSize={format.fontSize} />
                <TextColorPopover editor={editor} color={format.color} />
                <HighlightPopover editor={editor} highlight={format.highlight} />
                <TextPresetPopover editor={editor} />
              </div>
              <ToolbarIconButton
                icon={Paintbrush}
                short
                label={painter.armed ? "서식 복사 취소 (Esc)" : "서식 복사: 커서 위치의 서식을 다른 글자에 입혀요"}
                active={painter.armed}
                onClick={painter.toggle}
              />
              <ToolbarIconButton
                icon={Eraser}
                short
                label="서식 지우기"
                disabled={!format.cleanable}
                onClick={() => clearFormatting(editor.chain().focus(), editor.schema).run()}
              />
              <ToolbarIconButton
                icon={SuperscriptIcon}
                short
                label="위 첨자"
                active={format.superscript}
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
              />
              <ToolbarIconButton
                icon={SubscriptIcon}
                short
                label="아래 첨자"
                active={format.subscript}
                onClick={() => editor.chain().focus().toggleSubscript().run()}
              />
              <ToolbarIconButton
                icon={CaseSensitive}
                short
                label="드롭캡: 문단 첫 글자를 크게"
                active={format.dropCap}
                disabled={!format.inParagraph}
                onClick={() => editor.chain().focus().toggleDropCap().run()}
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
      {painter.armed && (
        <div className="uf-format-painter-hint" role="status">서식을 입힐 글자를 드래그하세요 · Esc로 취소</div>
      )}
    </div>
  );
}
