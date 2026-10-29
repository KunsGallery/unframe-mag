import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Image,
  Layout,
  Box,
  PieChart,
  Table,
  Quote,
  Heading2,
  Heading3,
  Layers,
  Sticker,
  Music,
  Mic,
  Minus,
  SquareStack,
  Columns2,
  Loader2,
  Images,
  Superscript,
  Link2,
} from "lucide-react";
import { useUploadImage } from "../../hooks/useUploadImage";
import { toEmbedURL, defaultEmbedHeight } from "../../lib/ufEmbed";
import { matchesSearchTerm, normalizeSearchText } from "../../lib/koreanSearch";
import { askEmbedUrl, askImageUrl } from "../../lib/editorPrompts";
import { insertLinkCard } from "../../lib/linkCard";
import {
  GALLERY_DEFAULTS,
  getParallaxMotionSpeed,
  PARALLAX_DEFAULTS,
  SLIDE_GALLERY_DEFAULTS,
  STICKY_STORY_DEFAULTS,
} from "../../constants/editorBlocks";

// Korean labels first; keywords keep the old English names searchable.
const SLASH_ITEMS = [
  { key: "h2", label: "대제목", desc: "큰 소제목 (H2)", keywords: "h2 heading 제목", icon: Heading2 },
  { key: "h3", label: "중제목", desc: "작은 소제목 (H3)", keywords: "h3 heading 제목", icon: Heading3 },
  { key: "quote", label: "인용문", desc: "인용 블록", keywords: "quote blockquote", icon: Quote },
  { key: "footnote", label: "각주", desc: "번호 각주 (글 끝 주석)", keywords: "footnote note 주석 출처", icon: Superscript },
  { key: "ufImage", label: "캡션 이미지", desc: "설명이 붙는 사진", keywords: "uf image 사진 그림", icon: Image },
  { key: "gallery", label: "갤러리", desc: "여러 장을 격자로", keywords: "gallery grid 사진", icon: Box },
  { key: "slideGallery", label: "슬라이드 갤러리", desc: "넘겨 보는 사진", keywords: "slide gallery carousel 사진", icon: Images },
  { key: "parallax", label: "패럴랙스 이미지", desc: "스크롤에 따라 움직이는 사진", keywords: "parallax 사진", icon: Layers },
  { key: "sticky", label: "스티키 스토리", desc: "사진을 고정하고 글이 흐름", keywords: "sticky story", icon: Sticker },
  { key: "scene", label: "장면", desc: "배경이 있는 장면 블록", keywords: "scene", icon: Layout },
  { key: "columns2", label: "2단 컬럼", desc: "두 칸으로 나누기", keywords: "columns 2 단", icon: Columns2 },
  { key: "columns3", label: "3단 컬럼", desc: "세 칸으로 나누기", keywords: "columns 3 단", icon: Columns2 },
  { key: "callout", label: "강조 박스", desc: "눈에 띄는 안내 상자", keywords: "callout note box", icon: SquareStack },
  { key: "divider", label: "구분선", desc: "단락 사이 구분", keywords: "divider line hr", icon: Minus },
  { key: "table", label: "표", desc: "3×3 표", keywords: "table", icon: Table },
  { key: "poll", label: "투표", desc: "독자 참여 투표", keywords: "poll vote", icon: PieChart },
  { key: "playlist", label: "플레이리스트", desc: "Spotify·YouTube 재생목록", keywords: "playlist music 음악 spotify youtube", icon: Music },
  { key: "linkCard", label: "링크 카드", desc: "사이트를 미리보기 카드로", keywords: "link card url 링크 미리보기 갤러리 og", icon: Link2 },
  { key: "podcast", label: "팟캐스트", desc: "Spotify·YouTube 에피소드", keywords: "podcast audio spotify youtube", icon: Mic },
];

function filterSlashItems(query) {
  const term = normalizeSearchText(query).replace(/\s+/g, "");
  if (!term) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((item) => matchesSearchTerm(`${item.label} ${item.desc} ${item.keywords}`, term));
}

const MENU_WIDTH = 256;
const MENU_MAX_HEIGHT = 360;

const SlashMenu = ({ pos, onClose, editor, onToast }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState({ pos: null, text: "" });
  const queryText = query.pos === pos ? query.text : "";
  const items = useMemo(() => filterSlashItems(queryText), [queryText]);
  const itemRefs = useRef([]);
  const fileInputRef = useRef(null);
  const pendingInsertPosRef = useRef(null);

  const { upload, uploading, progress, error, setError } = useUploadImage();

  const toast = useCallback(
    (message) => {
      if (typeof onToast === "function") onToast(message);
      else console.log(message);
    },
    [onToast]
  );

  const safeClose = useCallback(() => {
    if (typeof onClose === "function") onClose();
  }, [onClose]);

  // Removes the "/" and whatever was typed after it to filter the menu.
  const deleteSlashTrigger = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const { from } = editor.state.selection;
    const slashAt = typeof pos?.from === "number" ? pos.from - 1 : from - 1;
    const valid = slashAt >= 0 && slashAt < from && editor.state.doc.textBetween(slashAt, slashAt + 1) === "/";
    const start = valid ? slashAt : Math.max(from - 1, 0);
    editor.chain().focus().deleteRange({ from: start, to: from }).run();
  }, [editor, pos]);

  // Text typed after "/" filters the menu; leaving the line or a query that matches nothing closes it.
  useEffect(() => {
    if (!editor || !pos || typeof pos.from !== "number") return undefined;
    const sync = () => {
      if (editor.isDestroyed) return;
      const { doc, selection } = editor.state;
      const start = pos.from;
      if (selection.from < start || start < 1 || doc.textBetween(start - 1, start) !== "/") { safeClose(); return; }
      const text = doc.textBetween(start, selection.from, "\n", "\n");
      if (text.includes("\n") || text.length > 24 || (text && !filterSlashItems(text).length)) { safeClose(); return; }
      setQuery((prev) => (prev.pos === pos && prev.text === text ? prev : { pos, text }));
    };
    editor.on("transaction", sync);
    return () => editor.off("transaction", sync);
  }, [editor, pos, safeClose]);

  const insertUploadedContent = useCallback(
    (savedPos, content) => {
      if (!editor || editor.isDestroyed) return false;

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

  const handleSelect = useCallback(
    (item) => {
      if (!editor || editor.isDestroyed || uploading) return;

      deleteSlashTrigger();

      switch (item.key) {
        case "h2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;

        case "h3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;

        case "quote":
          editor.chain().focus().toggleBlockquote().run();
          break;

        case "footnote":
          editor.chain().focus().insertFootnote().run();
          break;

        case "scene":
          editor
            .chain()
            .focus()
            .insertContent({
              type: "scene",
              content: [{ type: "paragraph" }],
            })
            .run();
          break;

        case "ufImage": {
          askImageUrl("캡션 이미지 넣기").then((url) => {
          if (!url || editor.isDestroyed) return;
          editor
            .chain()
            .focus()
            .insertContent({
              type: "ufImage",
              attrs: { src: url, caption: "", size: "normal", align: "center" },
            })
            .run();
          });
          break;
        }

        case "parallax": {
          askImageUrl("패럴랙스 이미지 넣기").then((url) => {
          if (!url || editor.isDestroyed) return;
          editor
            .chain()
            .focus()
            .insertContent({
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
            })
            .run();
          });
          break;
        }

        case "sticky": {
          askImageUrl("스티키 스토리 이미지 넣기").then((url) => {
          // Cancelling still inserts the block; the image can be added from the inspector.
          if (url === null || editor.isDestroyed) return;
          editor
            .chain()
            .focus()
            .insertContent({
              type: "stickyStory",
              attrs: {
                imageSrc: url || null,
                ...STICKY_STORY_DEFAULTS,
              },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "이미지 옆에 흐를 글을 입력하세요." }],
                },
              ],
            })
            .run();
          });
          break;
        }

        case "columns2":
          editor
            .chain()
            .focus()
            .insertContent({
              type: "columns",
              attrs: {
                columns: 2,
                gap: 24,
                stackOnMobile: true,
                valign: "start",
              },
              content: [
                { type: "column", content: [{ type: "paragraph" }] },
                { type: "column", content: [{ type: "paragraph" }] },
              ],
            })
            .run();
          break;

        case "columns3":
          editor
            .chain()
            .focus()
            .insertContent({
              type: "columns",
              attrs: {
                columns: 3,
                gap: 24,
                stackOnMobile: true,
                valign: "start",
              },
              content: [
                { type: "column", content: [{ type: "paragraph" }] },
                { type: "column", content: [{ type: "paragraph" }] },
                { type: "column", content: [{ type: "paragraph" }] },
              ],
            })
            .run();
          break;

        case "gallery":
          setError?.("");
          pendingInsertPosRef.current = editor.state.selection.from;
          fileInputRef.current?.setAttribute("data-gallery-mode", "grid");
          fileInputRef.current?.click();
          return;

        case "slideGallery":
          setError?.("");
          pendingInsertPosRef.current = editor.state.selection.from;
          fileInputRef.current?.setAttribute("data-gallery-mode", "slide");
          fileInputRef.current?.click();
          return;

        case "poll":
          editor.chain().focus().insertUfPoll().run();
          break;

        case "table":
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;

        case "divider":
          editor
            .chain()
            .focus()
            .insertContent({
              type: "ufDivider",
              attrs: { styleType: "line" },
            })
            .run();
          break;

        case "callout":
          editor
            .chain()
            .focus()
            .insertContent({
              type: "ufCallout",
              attrs: { tone: "note", label: "NOTE" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "강조하고 싶은 내용을 입력하세요." }],
                },
              ],
            })
            .run();
          break;

        case "linkCard":
          insertLinkCard(editor, { onToast: toast });
          break;

        case "playlist":
        case "podcast": {
          const kind = item.key;
          askEmbedUrl(kind).then((url) => {
            if (!url || editor.isDestroyed) return;
            const theme = "0";
            const r = toEmbedURL(kind, url, { theme });
            editor
              .chain()
              .focus()
              .insertContent({
                type: kind === "podcast" ? "ufPodcast" : "ufPlaylist",
                attrs: { kind, url, embedUrl: r?.ok ? r.embedUrl : "", height: defaultEmbedHeight(kind), theme },
              })
              .run();
          });
          break;
        }

        default:
          break;
      }

      safeClose();
    },
    [editor, deleteSlashTrigger, safeClose, uploading, setError, toast]
  );

  const handleGalleryFiles = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length || !editor) return;

      try {
        setError?.("");
        toast(`갤러리 업로드 시작 · ${files.length}개 파일`);
        const savedPos = pendingInsertPosRef.current ?? editor.state.selection.from;

        const uploaded = [];

        for (const file of files) {
          const { url } = await upload(file, { variant: "inline" });
          uploaded.push({
            src: url,
            alt: "",
            caption: "",
            positionX: 50,
            positionY: 50,
          });
        }

        const mode = e.target?.getAttribute("data-gallery-mode") || "grid";

        insertUploadedContent(
          savedPos,
          mode === "slide"
            ? {
                type: "slideGallery",
                attrs: {
                  ...SLIDE_GALLERY_DEFAULTS,
                  images: uploaded,
                },
              }
            : {
                type: "gallery",
                attrs: {
                  ...GALLERY_DEFAULTS,
                  images: uploaded,
                },
              }
        );

        toast("갤러리 삽입 완료");
        safeClose();
      } catch (err) {
        console.error(err);
        toast(err?.userMessage || "갤러리 업로드 실패");
      } finally {
        pendingInsertPosRef.current = null;
        if (e.target) {
          e.target.value = "";
          e.target.removeAttribute("data-gallery-mode");
        }
      }
    },
    [editor, upload, safeClose, toast, setError, insertUploadedContent]
  );

  useEffect(() => {
    if (!pos) return;
    setSelectedIndex(0);
  }, [pos, queryText]);

  useEffect(() => {
    if (!pos) return;
    const el = itemRefs.current[selectedIndex];
    if (!el) return;

    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedIndex, pos]);

  useEffect(() => {
    // Capture phase: menu keys must not also move the cursor or split the paragraph.
    const handleKeyDown = (e) => {
      if (!pos || uploading || !items.length) return;
      if (e.isComposing || e.keyCode === 229) return;
      if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "ArrowDown") setSelectedIndex((prev) => (prev + 1) % items.length);
      else if (e.key === "ArrowUp") setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      else if (e.key === "Enter") handleSelect(items[Math.min(selectedIndex, items.length - 1)]);
      else { deleteSlashTrigger(); safeClose(); }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [pos, selectedIndex, handleSelect, deleteSlashTrigger, safeClose, uploading, items]);

  const menuStyle = useMemo(() => {
    if (!pos) return {};

    const padding = 12;
    const maxLeft = window.innerWidth - MENU_WIDTH - padding;
    const maxTop = window.innerHeight - MENU_MAX_HEIGHT - padding;

    return {
      left: Math.max(padding, Math.min(pos.x, maxLeft)),
      top: Math.max(padding, Math.min(pos.y, maxTop)),
    };
  }, [pos]);

  if (!editor || editor.isDestroyed || !pos) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryFiles}
      />

      <div
        className="fixed z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-64 overflow-hidden py-2"
        style={menuStyle}
      >
        <div className="px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-50 dark:border-zinc-800 mb-1">
          {queryText ? `블록 추가 · “${queryText}”` : "블록 추가 · 입력해서 찾기"}
        </div>

        {uploading && (
          <div className="px-4 pt-2 pb-1">
            <div className="flex items-center gap-2 text-[11px] font-black text-[#004aad]">
              <Loader2 size={14} className="animate-spin" />
              <span>갤러리 업로드 중… {progress}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-[#004aad] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {!!error && !uploading && (
          <div className="px-4 pt-2 pb-1 text-[11px] font-black text-red-500">
            {error}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          {items.map((item, index) => {
            const Icon = item.icon;
            const active = index === selectedIndex;

            return (
              <button
                key={item.key}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => handleSelect(item)}
                disabled={uploading}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  uploading
                    ? "opacity-50 cursor-not-allowed"
                    : active
                    ? "bg-[#004aad] text-white"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                type="button"
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    active && !uploading
                      ? "bg-white/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  <Icon size={16} />
                </div>

                <div>
                  <div
                    className={`text-xs font-black ${
                      active && !uploading ? "text-white" : "text-zinc-900 dark:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] ${
                      active && !uploading ? "text-white/70" : "text-zinc-400"
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SlashMenu;
