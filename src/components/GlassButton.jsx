import React from 'react';

/**
 * 뷰페이지 우측 플로팅 메뉴에서 사용되는 
 * 리퀴드 글라스(Liquid Glass) 스타일의 버튼입니다.
 */
export default function GlassButton({ children, active, onClick, className = "" }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 
        backdrop-blur-xl border border-white/20 shadow-lg 
        ${active ? 'bg-[#004aad] text-white shadow-[#004aad]/40' : 'bg-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-white/20'} 
        ${className}
      `}
    >
      {children}
    </button>
  );
}