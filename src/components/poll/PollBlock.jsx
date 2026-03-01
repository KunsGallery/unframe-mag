import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Plus, Trash2, PieChart } from 'lucide-react';

const PollBlock = ({ node, updateAttributes }) => {
  const { question, options } = node.attrs;

  const addOption = () => {
    updateAttributes({ options: [...options, { text: "", votes: 0 }] });
  };

  const updateOption = (index, text) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    updateAttributes({ options: newOptions });
  };

  const deleteOption = (index) => {
    if (options.length <= 2) return;
    updateAttributes({ options: options.filter((_, i) => i !== index) });
  };

  return (
    <NodeViewWrapper className="my-12">
      <div className="bg-[#f8faff] dark:bg-zinc-900/50 border-2 border-dashed border-[#004aad]/30 rounded-3xl p-8 max-w-[760px] mx-auto">
        <div className="flex items-center gap-2 mb-6 text-[#004aad]">
          <PieChart size={20} />
          <span className="text-xs font-black tracking-widest uppercase italic">Interactive Poll Block</span>
        </div>
        
        <input
          value={question}
          onChange={(e) => updateAttributes({ question: e.target.value })}
          placeholder="투표 주제를 입력하세요..."
          className="w-full text-2xl font-black tracking-tighter bg-transparent outline-none mb-8 border-b-2 border-[#004aad]/10 focus:border-[#004aad] pb-2 dark:text-white"
        />

        <div className="space-y-3 mb-6">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt.text}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`옵션 ${i + 1}`}
                className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl text-sm font-bold outline-none focus:border-[#004aad] dark:text-white"
              />
              <button onClick={() => deleteOption(i)} className="p-3 text-zinc-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addOption} className="w-full py-3 border-2 border-dotted border-zinc-200 dark:border-zinc-700 text-zinc-400 text-xs font-bold rounded-xl hover:border-[#004aad] hover:text-[#004aad] transition-all flex items-center justify-center gap-2">
          <Plus size={14}/> Add New Option
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export default PollBlock;