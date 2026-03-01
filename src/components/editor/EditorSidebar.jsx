import React from 'react';
import { Settings, BarChart3, Clock, CheckCircle, Save, Share2 } from 'lucide-react';

const EditorSidebar = ({ stats, onSave }) => {
  return (
    <div className="space-y-6">
      {/* 아티클 통계 카드 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-[24px] shadow-sm">
        <h5 className="text-[10px] font-black tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-2">
          <BarChart3 size={12}/> ARTICLE STATS
        </h5>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-2xl font-black italic text-[#004aad] dark:text-white">{stats.chars}</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Characters</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black italic text-[#004aad] dark:text-white">{stats.min}m</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Read Time</span>
          </div>
        </div>
      </div>

      {/* 설정 카드 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-[24px] shadow-sm">
        <h5 className="text-[10px] font-black tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-2">
          <Settings size={12}/> PUBLISHING
        </h5>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-zinc-500">CATEGORY</label>
            <select className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-[#004aad]">
              <option>Exhibition</option>
              <option>Interview</option>
              <option>Project</option>
              <option>News</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-zinc-500">EXCERPT (요약)</label>
            <textarea className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-3 rounded-xl text-xs outline-none focus:border-[#004aad] h-24 resize-none" placeholder="내용 요약을 입력하세요..."/>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-3 pt-4">
        <button onClick={() => onSave?.('draft')} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-black text-xs tracking-[0.2em] rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2">
          <Save size={16}/> SAVE DRAFT
        </button>
        <button onClick={() => onSave?.('published')} className="w-full py-5 bg-[#004aad] text-white font-black text-xs tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
          <Share2 size={16}/> PUBLISH NOW
        </button>
      </div>
    </div>
  );
};

export default EditorSidebar;