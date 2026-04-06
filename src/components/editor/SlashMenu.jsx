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
} from "lucide-react";
import { useUploadImage } from "../../hooks/useUploadImage";
import { toEmbedURL, defaultEmbedHeight } from "../../lib/ufEmbed";

const SLASH_ITEMS = [
  { key: "scene", label: "Scene", desc: "장면 블록 추가", icon: Layout },
  { key: "ufImage", label: "UF Image", desc: "캡션 이미지 블록", icon: Image },
  { key: "parallax", label: "Parallax", desc: "패럴랙스 이미지", icon: Layers },
  { key: "sticky", label: "Sticky Story", desc: "스티키 스토리 레이아웃", icon: Sticker },
 
  { key: "columns2", label: "2 Columns", desc: "2단 컬럼 레이아웃", icon: Columns2 },
  { key: "columns3", label: "3 Columns", desc: "3단 컬럼 레이아웃", icon: Columns2 },
  { key: "gallery", label: "Gallery", desc: "그리드 갤러리", icon: Box },
  { key: "poll", label: "Poll", desc: "참여형 투표", icon: PieChart },
  { key: "table", label: "Table", desc: "표 삽입", icon: Table },
  { key: "divider", label: "Divider", desc: "구분선 삽입", icon: Minus },
  { key: "callout", label: "Callout", desc: "강조 박스 삽입", icon: SquareStack },

  { key: "playlist", label: "Playlist", desc: "Unframe Playlist 플레이어", icon: Music },
  { key: "podcast", label: "Podcast", desc: "Unframe Podcast 플레이어", icon: Mic },

  { key: "quote", label: "Quote", desc: "인용문", icon: Quote },
  { key: "h2", label: "H2", desc: "대제목", icon: Heading2 },
  { key: "h3", label: "H3", desc: "중제목", icon: Heading3 },
];

const MENU_WIDTH = 256;
const MENU_MAX_HEIGHT = 320;

const SlashMenu = ({ pos, onClose, editor }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef([]);
  const fileInputRef = useRef(null);
  const { upload } = useUploadImage();

  const safeClose = useCallback(() => {
    if (typeof onClose === "function") onClose();
  }, [onClose]);

  const deleteSlashTrigger = useCallback(() => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const start = Math.max(from - 1, 0);
    editor.chain().focus().deleteRange({ from: start, to: from }).run();
  }, [editor]);

  const handleSelect = useCallback(
    (item) => {
      if (!editor) return;

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
          const url = window.prompt("UF Image URL");
          if (!url) break;
          editor
            .chain()
            .focus()
            .insertContent({
              type: "ufImage",
              attrs: { src: url, caption: "", size: "normal", align: "center" },
            })
            .run();
          break;
        }

        case "parallax": {
          const url = window.prompt("Parallax Image URL");
          if (!url) break;
          editor
            .chain()
            .focus()
            .insertContent({
              type: "parallaxImage",
              attrs: {
                src: url,
                caption: "",
                speed: 0.2,
                height: "70vh",
                bleed: true,
              },
            })
            .run();
          break;
        }

        case "sticky": {
          const url = window.prompt("Sticky Story Image URL");
          editor
            .chain()
            .focus()
            .insertContent({
              type: "stickyStory",
              attrs: {
                imageSrc: url || null,
                imagePos: "left",
                stickyHeight: "100vh",
              },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Sticky story text..." }],
                },
              ],
            })
            .run();
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
                {
                  type: "column",
                  content: [{ type: "paragraph" }],
                },
                {
                  type: "column",
                  content: [{ type: "paragraph" }],
                },
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
                {
                  type: "column",
                  content: [{ type: "paragraph" }],
                },
                {
                  type: "column",
                  content: [{ type: "paragraph" }],
                },
                {
                  type: "column",
                  content: [{ type: "paragraph" }],
                },
              ],
            })
            .run();
          break;

        case "gallery": {
          fileInputRef.current?.click();
          return;
        }

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

        case "playlist": {
          const url = window.prompt(
            "Playlist URL (Spotify playlist)",
            "https://open.spotify.com/playlist/"
          );

          const theme = "0";
          const r = url ? toEmbedURL("playlist", url, { theme }) : null;

          editor
            .chain()
            .focus()
            .insertContent({
              type: "ufPlaylist",
              attrs: {
                kind: "playlist",
                url: url || "",
                embedUrl: r?.ok ? r.embedUrl : "",
                height: defaultEmbedHeight("playlist"),
                theme,
              },
            })
            .run();
          break;
        }

        case "podcast": {
          const url = window.prompt(
            "Podcast URL (Spotify show/episode)",
            "https://open.spotify.com/show/"
          );

          const theme = "0";
          const r = url ? toEmbedURL("podcast", url, { theme }) : null;

          editor
            .chain()
            .focus()
            .insertContent({
              type: "ufPodcast",
              attrs: {
                kind: "podcast",
                url: url || "",
                embedUrl: r?.ok ? r.embedUrl : "",
                height: defaultEmbedHeight("podcast"),
                theme,
              },
            })
            .run();
          break;
        }

        default:
          break;
      }

      safeClose();
    },
    [editor, deleteSlashTrigger, safeClose]
  );

  const handleGalleryFiles = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length || !editor) return;

      try {
        const uploaded = [];

        for (const file of files) {
          const { url } = await upload(file, { variant: "inline" });
          uploaded.push({ src: url, alt: "" });
        }

        editor
          .chain()
          .focus()
          .insertContent({
            type: "gallery",
            attrs: {
              images: uploaded,
              columns: Math.min(2, uploaded.length) || 2,
              gap: 12,
            },
          })
          .run();

        safeClose();
      } catch (err) {
        console.error(err);
      } finally {
        if (e.target) e.target.value = "";
      }
    },
    [editor, upload, safeClose]
  );

  useEffect(() => {
    if (!pos) return;
    setSelectedIndex(0);
  }, [pos]);

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
    const handleKeyDown = (e) => {
      if (!pos) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % SLASH_ITEMS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + SLASH_ITEMS.length) % SLASH_ITEMS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(SLASH_ITEMS[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        deleteSlashTrigger();
        safeClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pos, selectedIndex, handleSelect, deleteSlashTrigger, safeClose]);

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

  if (!pos) return null;

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
          Commands
        </div>

        <div className="max-h-80 overflow-y-auto">
          {SLASH_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const active = index === selectedIndex;

            return (
              <button
                key={item.key}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-[#004aad] text-white"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                type="button"
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    active
                      ? "bg-white/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  <Icon size={16} />
                </div>

                <div>
                  <div
                    className={`text-xs font-black ${
                      active ? "text-white" : "text-zinc-900 dark:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] ${
                      active ? "text-white/70" : "text-zinc-400"
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