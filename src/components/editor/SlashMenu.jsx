import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

const SLASH_ITEMS = [
  { key: "scene", label: "Scene", desc: "장면 블록 추가", icon: Layout },
  { key: "ufImage", label: "UF Image", desc: "캡션 이미지 블록", icon: Image },
  { key: "parallax", label: "Parallax", desc: "패럴랙스 이미지", icon: Layers },
  { key: "sticky", label: "Sticky Story", desc: "스티키 스토리 레이아웃", icon: Sticker },

  { key: "gallery", label: "Gallery", desc: "그리드 갤러리", icon: Box },
  { key: "poll", label: "Poll", desc: "참여형 투표", icon: PieChart },
  { key: "table", label: "Table", desc: "표 삽입", icon: Table },

  { key: "quote", label: "Quote", desc: "인용문", icon: Quote },
  { key: "h2", label: "H2", desc: "대제목", icon: Heading2 },
  { key: "h3", label: "H3", desc: "중제목", icon: Heading3 },
];

const SlashMenu = ({ pos, onClose, editor }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

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

      // 1) 슬래시 문자 삭제
      deleteSlashTrigger();

      // 2) 명령 실행
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
              attrs: { src: url, caption: "", speed: 0.2, height: "70vh", bleed: true },
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
              attrs: { imageSrc: url || null, imagePos: "left", stickyHeight: "100vh" },
              // stickyStory는 content: 'block+' 이라 최소 1개 block이 필요!
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

        case "gallery": {
          const url1 = window.prompt("Gallery Image 1 URL") || "";
          const url2 = window.prompt("Gallery Image 2 URL") || "";
          const images = [
            url1 ? { src: url1, alt: "" } : null,
            url2 ? { src: url2, alt: "" } : null,
          ].filter(Boolean);

          editor
            .chain()
            .focus()
            .insertContent({
              type: "gallery",
              attrs: { columns: 2, gap: 12, images },
            })
            .run();
          break;
        }

        case "poll": {
          editor
            .chain()
            .focus()
            .insertUfPoll()
            .run();
          break;
        }

        case "table": {
          editor
            .chain()
            .focus()
            .insertTable({
              rows: 3,
              cols: 3,
              withHeaderRow: true 
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
        safeClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pos, selectedIndex, handleSelect, safeClose]);

  if (!pos) return null;

  return (
    <div
      className="fixed z-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-64 overflow-hidden py-2"
      style={{ left: pos.x, top: pos.y }}
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
              onClick={() => handleSelect(item)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                active ? "bg-[#004aad] text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${active ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                <Icon size={16} />
              </div>
              <div>
                <div className={`text-xs font-black ${active ? "text-white" : "text-zinc-900 dark:text-zinc-200"}`}>
                  {item.label}
                </div>
                <div className={`text-[10px] ${active ? "text-white/70" : "text-zinc-400"}`}>
                  {item.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlashMenu;