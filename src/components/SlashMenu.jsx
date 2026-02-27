import React, { useState, useEffect } from 'react';
import { Image, Layout, Box, PieChart, Table, Quote, Heading2, Heading3 } from 'lucide-react';

const SLASH_ITEMS = [
  { key: "scene", label: "Scene", desc: "장면 블록 추가", icon: Layout },
  { key: "image", label: "Image", desc: "이미지 삽입", icon: Image },
  { key: "gallery", label: "Gallery", desc: "그리드 갤러리", icon: Box },
  { key: "poll", label: "Poll", desc: "참여형 투표", icon: PieChart },
  { key: "table", label: "Table", desc: "표 삽입", icon: Table },
  { key: "quote", label: "Quote", desc: "인용문", icon: Quote },
  { key: "h2", label: "H2", desc: "대제목", icon: Heading2 },
  { key: "h3", label: "H3", desc: "중제목", icon: Heading3 },
];

const SlashMenu = ({ pos, onClose, editor }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        setSelectedIndex(prev => (prev + 1) % SLASH_ITEMS.length);
      } else if (e.key === "ArrowUp") {
        setSelectedIndex(prev => (prev - 1 + SLASH_ITEMS.length) % SLASH_ITEMS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(SLASH_ITEMS[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  const handleSelect = (item) => {
    // 슬래시 문자 삭제 후 명령어 실행
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    
    // 명령어 실행 (임시 insert 로직)
    if (item.key === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (item.key === 'quote') editor.chain().focus().toggleBlockquote().run();
    if (item.key === 'poll') editor.chain().focus().insertContent({ type: 'ufPoll' }).run();
    
    onClose();
  };

  return (
    <div 
      className="fixed z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-64 overflow-hidden py-2"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-50 dark:border-zinc-800 mb-1">
        Commands
      </div>
      <div className="max-h-80 overflow-y-auto">
        {SLASH_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => handleSelect(item)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${index === selectedIndex ? 'bg-[#004aad] text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              <div className={`p-1.5 rounded-lg ${index === selectedIndex ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                <Icon size={16} />
              </div>
              <div>
                <div className={`text-xs font-black ${index === selectedIndex ? 'text-white' : 'text-zinc-900 dark:text-zinc-200'}`}>{item.label}</div>
                <div className={`text-[10px] ${index === selectedIndex ? 'text-white/70' : 'text-zinc-400'}`}>{item.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlashMenu;