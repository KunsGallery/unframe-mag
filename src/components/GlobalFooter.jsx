import React from 'react';

const GlobalFooter = () => {
  // SNS 링크 데이터
  const socialLinks = [
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/unframe.kr',
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@unframe_kr',
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ];

  const CubeIcon = () => (
    <svg className="w-3.5 h-3.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      <path d="M2 7v10M12 12v10M22 7v10"></path>
    </svg>
  );

  return (
    <footer className="w-full bg-[#FDFBF7] dark:bg-zinc-950 text-[#004aad] dark:text-zinc-400 py-16 px-10 font-sans border-t border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-sm leading-relaxed">
        
        {/* Column 1: Location & Hours */}
        <div className="flex flex-direction-column flex-col">
          <div className="h-[60px] flex items-start">
            <h2 className="text-4xl font-black tracking-tighter leading-none italic">U#</h2>
          </div>
          <div className="flex items-center gap-2 font-bold mb-3">
            <CubeIcon /> <span>장소 및 운영안내</span>
          </div>
          <hr className="border-[#004aad] dark:border-zinc-700 mb-5 w-full" />
          <ul className="space-y-1.5 opacity-90">
            <li className="relative pl-3.5 before:content-['·'] before:absolute before:left-0">
              서울특별시 종로구 인사동4길 17, 1층 108호
            </li>
            <li className="relative pl-3.5 before:content-['·'] before:absolute before:left-0">
              (화-일) 11:00am - 07:00pm (월요일 휴관)
            </li>
            <li className="relative pl-3.5 before:content-['·'] before:absolute before:left-0">
              T. 0502-1322-8906
            </li>
          </ul>
        </div>

        {/* Column 2: Business Info */}
        <div className="flex flex-col">
          <div className="h-[60px] hidden md:block" />
          <div className="flex items-center gap-2 font-bold mb-3">
            <CubeIcon /> <span>UNFRAME (U#)</span>
          </div>
          <hr className="border-[#004aad] dark:border-zinc-700 mb-5 w-full" />
          <ul className="space-y-1.5 opacity-90">
            <li className="relative pl-3.5 before:content-['·'] before:absolute before:left-0">대표: 김재우</li>
            <li className="relative pl-3.5 before:content-['·'] before:absolute before:left-0">개인정보관리자: 박소연</li>
            <li className="relative pl-3.5 before:content-['·'] before:absolute before:left-0">사업자번호: 668-27-02010</li>
            <li className="relative pl-3.5 before:content-['·'] before:absolute before:left-0">통신판매업신고: 제 2026-서울종로-0250 호</li>
          </ul>
        </div>

        {/* Column 3: Policy & Copyright */}
        <div className="flex flex-col">
          <div className="h-[60px] hidden md:block" />
          <div className="flex items-center gap-2 font-bold mb-3">
            <CubeIcon /> <span>이용약관 및 정책</span>
          </div>
          <hr className="border-[#004aad] dark:border-zinc-700 mb-5 w-full" />
          <nav className="flex flex-col gap-2 mb-5 font-bold">
            <a href="/terms" className="hover:underline transition-opacity hover:opacity-70">이용약관</a>
            <a href="/privacy" className="hover:underline transition-opacity hover:opacity-70">개인정보처리방침</a>
          </nav>
          <div className="text-[11px] opacity-60 leading-tight">
            Copyright © 2026 UNFRAME<br />
            All rights reserved.
          </div>
        </div>
      </div>

      {/* Social & Slogan Section */}
      <div className="mt-24 flex flex-col items-center">
        <div className="flex gap-6 mb-6">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-60 transition-opacity"
              aria-label={link.name}
            >
              {link.icon}
            </a>
          ))}
        </div>
        <div className="text-lg md:text-xl font-extrabold tracking-[0.15em] uppercase text-center">
          Unframe Your Perspective
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;