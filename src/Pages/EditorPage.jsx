import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Type, Layout, Image as ImageIcon, Youtube, 
  Save, Send, Hash, ChevronRight, Clock, BarChart2,
  Bold, Italic, List, Quote, Heading1, Heading2, Code
} from 'lucide-react';

// --- Tiptap Extensions ---
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

// --- Firebase ---
import { db } from '../firebase/config';
import { 
  collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp 
} from 'firebase/firestore';

const EditorPage = ({ isDarkMode, onToast, user }) => {
  const navigate = useNavigate();
  
  // 기본 상태 관리
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("EDITORIAL");
  const [cover, setCover] = useState("");
  const [coverMedium, setCoverMedium] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // --- Tiptap 에디터 설정 ---
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: '당신의 이야기를 언프레임 하세요... (/ 를 눌러 명령어 메뉴)',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] italic font-light leading-relaxed',
      },
    },
  });

  // --- 자동 에디션 넘버링 및 저장 로직 ---
  const getNextEditionInfo = async () => {
    try {
      const q = query(collection(db, "articles"), orderBy("sortIndex", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      let nextIndex = 1;
      if (!querySnapshot.empty) {
        nextIndex = querySnapshot.docs[0].data().sortIndex + 1;
      }
      const nextEditionNo = String(nextIndex).padStart(3, '0');
      return { nextIndex, nextEditionNo };
    } catch (error) {
      console.error("Error fetching edition info:", error);
      return { nextIndex: Date.now(), nextEditionNo: "999" };
    }
  };

  const handlePublish = async (status = "published") => {
    if (!title.trim()) {
      onToast("제목을 입력해야 합니다.");
      return;
    }

    setIsSaving(true);
    const { nextIndex, nextEditionNo } = await getNextEditionInfo();
    const contentHTML = editor?.getHTML(); // Tiptap에서 HTML 데이터 추출

    const articleData = {
      title,
      subtitle,
      contentHTML,
      category,
      cover,
      coverMedium,
      editionNo: nextEditionNo,
      sortIndex: nextIndex,
      author: user?.displayName || "Admin",
      authorEmail: user?.email,
      status: status,
      likes: 0,
      views: 0,
      tags: [],
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "articles"), articleData);
      onToast(status === "published" ? "아티클이 발행되었습니다!" : "임시 저장이 완료되었습니다.");
      if (status === "published") navigate('/');
    } catch (error) {
      console.error("Save Error:", error);
      onToast("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 관리자 권한 체크
  const ADMIN_EMAILS = ["gallerykuns@gmail.com", "cybog2004@gmail.com", "sylove887@gmail.com"];
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return <div className="p-40 text-center font-black italic uppercase tracking-widest text-zinc-400">Access Denied.</div>;
  }

  return (
    <div className={`min-h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-12 gap-px animate-in fade-in duration-500 ${isDarkMode ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      
      {/* --- 왼쪽 사이드바: 설정 및 메트릭 --- */}
      <aside className={`lg:col-span-3 p-10 flex flex-col gap-10 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white border-zinc-50 shadow-xl'}`}>
        <div className="p-8 bg-[#004aad] text-white rounded-[3rem] shadow-xl border border-white/10 italic">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase mb-4 opacity-60">Article Metrics</p>
          <div className="flex justify-between items-end">
            <div><p className="text-4xl font-black tracking-tighter">READ</p><p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-80">TIME ENGINE</p></div>
            <div className="text-right"><p className="text-2xl font-black">U#</p><p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-80">EDITION</p></div>
          </div>
        </div>

        <div className="space-y-8 px-2 uppercase tracking-widest font-black italic">
          <div className="space-y-3">
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full p-4 border-2 text-[12px] focus:outline-none focus:border-[#004aad] transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-100 text-black'}`}
            >
              <option value="EDITORIAL">EDITORIAL</option>
              <option value="INTERVIEW">INTERVIEW</option>
              <option value="EXHIBITION">EXHIBITION</option>
              <option value="PROJECT">PROJECT</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Cover Media (Medium)</label>
            <input 
              type="text" 
              placeholder="Cover Medium URL" 
              value={coverMedium}
              onChange={(e) => setCoverMedium(e.target.value)}
              className={`w-full p-3 text-[10px] border-b focus:outline-none bg-transparent ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
            />
          </div>
        </div>

        <div className="mt-auto space-y-4 px-2 pb-6">
          <button 
            onClick={() => handlePublish("draft")}
            disabled={isSaving}
            className={`w-full py-5 font-black uppercase tracking-[0.5em] text-[10px] flex items-center justify-center gap-3 transition-all hover:opacity-70 rounded-2xl ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-50 text-zinc-400'}`}
          >
            <Save size={14}/> {isSaving ? "SAVING..." : "Save Draft"}
          </button>
          <button 
            onClick={() => handlePublish("published")}
            disabled={isSaving}
            className="w-full py-5 bg-[#004aad] text-white font-black uppercase tracking-[0.5em] text-[10px] flex items-center justify-center gap-3 hover:bg-black shadow-xl transition-all rounded-2xl italic"
          >
            <Send size={14}/> {isSaving ? "PUBLISHING..." : "Publish Issue"}
          </button>
        </div>
      </aside>

      {/* --- 메인 에디터 영역 --- */}
      <main className={`lg:col-span-9 flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        
        {/* Tiptap 툴바 */}
        <div className={`p-6 border-b flex flex-wrap gap-4 items-center sticky top-[80px] z-30 backdrop-blur-3xl transition-colors ${isDarkMode ? 'bg-black/90 border-zinc-900' : 'bg-white/90 border-zinc-50'}`}>
          <div className="flex bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded-xl gap-1">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg ${editor?.isActive('bold') ? 'bg-[#004aad] text-white' : 'text-zinc-400 hover:bg-white'}`}><Bold size={18}/></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg ${editor?.isActive('italic') ? 'bg-[#004aad] text-white' : 'text-zinc-400 hover:bg-white'}`}><Italic size={18}/></button>
          </div>
          <div className="flex bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded-xl gap-1">
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded-lg ${editor?.isActive('heading', { level: 1 }) ? 'bg-[#004aad] text-white' : 'text-zinc-400 hover:bg-white'}`}><Heading1 size={18}/></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-lg ${editor?.isActive('heading', { level: 2 }) ? 'bg-[#004aad] text-white' : 'text-zinc-400 hover:bg-white'}`}><Heading2 size={18}/></button>
          </div>
          <div className="flex bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded-xl gap-1">
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg ${editor?.isActive('bulletList') ? 'bg-[#004aad] text-white' : 'text-zinc-400 hover:bg-white'}`}><List size={18}/></button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 rounded-lg ${editor?.isActive('blockquote') ? 'bg-[#004aad] text-white' : 'text-zinc-400 hover:bg-white'}`}><Quote size={18}/></button>
          </div>
          <button onClick={() => {
            const url = window.prompt('Image URL');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-zinc-400 hover:text-[#004aad] transition-all"><ImageIcon size={20}/></button>
        </div>

        {/* 에디터 캔버스 */}
        <div className="flex-grow p-12 md:p-32 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="ENTER TITLE..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-7xl font-black italic tracking-tighter focus:outline-none bg-transparent placeholder:text-zinc-100 dark:placeholder:text-zinc-900 ${isDarkMode ? 'text-white' : 'text-black'}`} 
              />
              <div className="h-2 w-24 bg-[#004aad] shadow-[0_0_15px_#004aad]"></div>
            </div>
            
            <input 
              type="text" 
              placeholder="Subtitle here..." 
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className={`w-full text-2xl font-light italic focus:outline-none bg-transparent border-l-4 border-[#004aad] pl-8 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`} 
            />

            {/* Tiptap 실제 에디터 컴포넌트 */}
            <div className="editor-container">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror { min-height: 500px; outline: none; }
      `}</style>
    </div>
  );
};

export default EditorPage;