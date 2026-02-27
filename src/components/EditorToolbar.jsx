import React from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Quote, Type, Minus
} from 'lucide-react';

const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  const btnClass = (active) => `
    p-2 rounded-lg transition-all 
    ${active 
      ? 'bg-[#004aad] text-white shadow-md' 
      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#004aad]'}
  `;

  return (
    <div className="sticky top-20 z-40 w-full px-6 mb-6">
      <div className="max-w-[1200px] mx-auto bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-2 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-1">
          {/* Text Styles */}
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}><Bold size={18}/></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}><Italic size={18}/></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))}><Underline size={18}/></button>
          
          <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-2" />
          
          {/* Headings */}
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))}><span className="text-xs font-black">H2</span></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))}><span className="text-xs font-black">H3</span></button>
          
          <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-2" />

          {/* Alignment */}
          <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))}><AlignLeft size={18}/></button>
          <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))}><AlignCenter size={18}/></button>
          <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))}><AlignRight size={18}/></button>

          <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-2" />

          {/* Lists & Others */}
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}><List size={18}/></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))}><ListOrdered size={18}/></button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))}><Quote size={18}/></button>
          <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass(false)}><Minus size={18}/></button>
        </div>
        
        <div className="text-[10px] font-black tracking-widest text-[#004aad] dark:text-zinc-500 pr-4 uppercase">
          U# Kinfolk Editor
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;