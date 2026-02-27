import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react'; // lucide-react 아이콘 사용

const Topbar = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // 다크모드 상태 관리
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 스크롤 시 상단바 스타일 변경 (유리 질감 효과)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'ABOUT', path: '/about' },
    { name: 'ARCHIVE', path: '/archive' },
    { name: 'PROJECTS', path: '/projects' },
    { name: 'MY U#', path: '/mypage' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 px-6 md:px-10 ${
        isScrolled 
          ? 'h-16 bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50' 
          : 'h-24 bg-transparent'
      } flex items-center justify-between`}
    >
      {/* 로고 영역 */}
      <div className="flex items-center">
        <a href="/" className="text-3xl font-black italic tracking-tighter text-[#004aad] dark:text-white">
          U#
        </a>
      </div>

      {/* 데스크탑 메뉴 */}
      <div className="hidden md:flex items-center gap-10">
        <div className="flex gap-8 items-center">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.path}
              className="text-xs font-bold tracking-widest text-zinc-900 dark:text-zinc-300 hover:text-[#004aad] dark:hover:text-white transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* 다크모드 토글 버튼 */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-[#004aad] dark:text-zinc-400"
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* 모바일 햄버거 버튼 */}
      <div className="md:hidden flex items-center gap-4">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 text-[#004aad] dark:text-zinc-400"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-[#004aad] dark:text-white"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* 모바일 풀스크린 메뉴 */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-40 flex flex-col items-center justify-center gap-8 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.path}
              onClick={() => setIsMenuOpen(false)}
              className="text-2xl font-black tracking-tighter text-[#004aad] dark:text-white"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Topbar;