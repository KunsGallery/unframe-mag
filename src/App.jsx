import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation 
} from 'react-router-dom';
import { 
  Sun, Moon, Menu, Heart, Share2, Bookmark, ArrowLeft, 
  ChevronRight, Camera, Type, Layout, Image as ImageIcon, 
  Youtube, BarChart2, Edit3, User, Trophy, BookOpen, Clock, 
  Hash, Save, Send, Plus, MapPin, Bell, Zap, Layers, Info, 
  ShieldCheck, Search, X, MessageSquare, MoreHorizontal, Settings, ArrowUp, LogOut
} from 'lucide-react';

// Firebase (config.js 설정 완료 가정)
import { auth, googleProvider, db } from './firebase/config';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// =========================================================================
// 🎨 [PART 1] Global Configuration & Constants
// =========================================================================

const PRIMARY_BLUE = '#004aad';
const ADMIN_EMAILS = ["gallerykuns@gmail.com", "cybog2004@gmail.com", "sylove887@gmail.com"];

const CATEGORIES = [
  { key: "All", label: "View All Archive", sub: "ALL ITEMS" },
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01" },
  { key: "Project", label: "Project", sub: "CATEGORY 02" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03" },
  { key: "News", label: "News", sub: "CATEGORY 04" },
];

// =========================================================================
// 🧩 [PART 2] Shared Components
// =========================================================================

const StreamingTextBackground = () => {
  const [streamers, setStreamers] = useState([]);
  useEffect(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      items.push({
        id: i,
        text: `#${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
        top: `${Math.random() * 100}%`,
        speed: 25 + Math.random() * 45,
        delay: -Math.random() * 50,
        fontSize: 35 + Math.random() * 110,
        opacity: 0.05
      });
    }
    setStreamers(items);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {streamers.map((s) => (
        <div key={s.id} className="absolute whitespace-nowrap font-black italic tracking-tighter uppercase" style={{
            top: s.top, left: '100%', fontSize: `${s.fontSize}px`, opacity: s.opacity, color: PRIMARY_BLUE,
            animation: `streamText ${s.speed}s linear infinite`, animationDelay: `${s.delay}s`
          }}>
          {s.text} UNFRAME U# EDITION
        </div>
      ))}
      <style>{`@keyframes streamText { from { transform: translateX(0); } to { transform: translateX(-400vw); } }`}</style>
    </div>
  );
};

const Navbar = ({ toggleTheme, isDarkMode, user, onLogin, onLogout }) => {
  const location = useLocation();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  return (
    <nav className={`h-[80px] border-b px-6 md:px-12 flex justify-between items-center sticky top-0 z-[100] transition-all duration-500 ${isDarkMode ? 'bg-black/90 border-zinc-900' : 'bg-white/90 border-zinc-50'} backdrop-blur-3xl shadow-sm`}>
      <div className="flex items-center gap-20">
        <Link to="/" className="text-4xl font-black italic tracking-tighter hover:text-[#004aad] transition-colors">U<span className="text-[#004aad]">#</span></Link>
        <div className="hidden lg:flex gap-12 text-[11px] font-black uppercase tracking-[0.6em] text-zinc-400 italic">
          <Link to="/" className={`hover:text-[#004aad] relative group ${location.pathname === '/' ? (isDarkMode ? 'text-white' : 'text-black') : ''}`}>Archive<span className={`absolute -bottom-2 left-0 h-1 bg-[#004aad] transition-all duration-500 ${location.pathname === '/' ? 'w-full' : 'w-0 group-hover:w-1/2'}`}></span></Link>
          <Link to="/about" className={`hover:text-[#004aad] relative group ${location.pathname === '/about' ? (isDarkMode ? 'text-white' : 'text-black') : ''}`}>About<span className={`absolute -bottom-2 left-0 h-1 bg-[#004aad] transition-all duration-500 ${location.pathname === '/about' ? 'w-full' : 'w-0 group-hover:w-1/2'}`}></span></Link>
          <Link to="/profile" className={`hover:text-[#004aad] relative group ${location.pathname === '/profile' ? (isDarkMode ? 'text-white' : 'text-black') : ''}`}>My U#<span className={`absolute -bottom-2 left-0 h-1 bg-[#004aad] transition-all duration-500 ${location.pathname === '/profile' ? 'w-full' : 'w-0 group-hover:w-1/2'}`}></span></Link>
        </div>
      </div>
      <div className="flex items-center gap-6">
        {isAdmin && (
          <Link to="/write" className={`p-4 rounded-2xl hover:bg-[#004aad]/10 transition-all ${location.pathname === '/write' ? 'text-[#004aad] bg-[#004aad]/5' : 'text-zinc-400 hover:text-[#004aad]'}`} title="Write Article"><Edit3 size={24}/></Link>
        )}
        <button onClick={toggleTheme} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-[#004aad] transition-all shadow-inner group">
          {isDarkMode ? <Sun size={24} className="group-hover:rotate-90 transition-all duration-700" /> : <Moon size={24} className="group-hover:-rotate-12 transition-all duration-700" />}
        </button>
        {user ? (
          <button onClick={onLogout} className="flex items-center gap-2 p-2 rounded-xl text-zinc-400 hover:text-red-500 transition-all"><LogOut size={20}/></button>
        ) : (
          <button onClick={onLogin} className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg hover:bg-[#004aad] hover:text-white transition-all">Login</button>
        )}
      </div>
    </nav>
  );
};

const GlobalFooter = () => (
  <footer className="bg-white dark:bg-zinc-950 py-40 px-6 relative transition-colors border-t border-zinc-100 dark:border-zinc-900 font-black italic uppercase tracking-[0.4em] text-[11px]">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-24 text-center md:text-left pt-20">
        <div className="space-y-6">
          <p className="text-[#004aad] tracking-[1.2em]">/ CONTACT</p>
          <div className="space-y-3 opacity-50 dark:text-white">
            <p>서울특별시 종로구 인사동4길 17, 108호</p>
            <p>0502-1322-8906</p>
          </div>
        </div>
        <div className="space-y-6">
          <p className="text-[#004aad] tracking-[1.2em]">/ INFO</p>
          <div className="space-y-3 opacity-50 dark:text-white">
            <p>Representative: Kim Jae Woo</p>
            <p>Business No: 668-27-02010</p>
            <p>Mail Order: 2026-서울종로-0250</p>
          </div>
        </div>
        <div className="space-y-6">
          <p className="text-[#004aad] tracking-[1.2em]">/ LEGAL</p>
          <div className="space-y-3 flex flex-col gap-2 opacity-50 dark:text-white">
            <a href="#" className="hover:text-[#004aad]">Terms of Service</a>
            <a href="#" className="hover:text-[#004aad]">Privacy Policy</a>
          </div>
        </div>
    </div>
    <div className="mt-40 text-center opacity-30 text-[9px] tracking-[1.2em] dark:text-white italic uppercase">© UNFRAME MAG · Breaking frames, Building resonance.</div>
  </footer>
);

// =========================================================================
// 🚀 [PART 3] Page Components
// =========================================================================

// --- 🏠 Home Page ---
const HomePage = ({ isDarkMode }) => {
  const navigate = useNavigate();
  return (
    <div className="animate-in fade-in duration-1000">
      <header className="relative h-[90vh] flex flex-col items-center justify-center text-center text-white overflow-hidden bg-black">
        <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070" className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105" alt="Hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        <div className="relative z-10 px-6 mt-16 max-w-5xl">
          <p className="mb-6 tracking-[0.6em] text-[10px] uppercase opacity-80 font-black italic bg-[#004aad] inline-block px-4 py-1 italic">Featured Article</p>
          <h1 className="font-black mb-10 leading-[1.1] tracking-tighter text-6xl md:text-[100px] lg:text-[120px] italic drop-shadow-2xl uppercase">Any Letter<br />That Inspires You.</h1>
          <p className="font-light opacity-90 leading-relaxed italic text-lg md:text-2xl mb-16 max-w-3xl mx-auto">"종이 위로 흐르는 선율, 당신의 서재에 도착한 특별한 한 조각."</p>
        </div>
      </header>

      <section className="bg-[#fdfd75] py-24 px-6 text-center text-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="mb-8 font-black text-4xl md:text-6xl italic tracking-tighter leading-tight uppercase italic">Get Any Letter Every Wednesday – It's Going To Be A Special Wednesday.</h2>
          <div className="flex flex-col md:flex-row gap-6 max-w-2xl mx-auto border-b-4 border-black pb-6 mt-12">
            <input type="email" placeholder="Your favorite email address" className="flex-1 bg-transparent py-4 px-2 focus:outline-none placeholder:text-zinc-600 text-2xl font-bold italic" />
            <button className="bg-black text-white px-12 py-5 font-black text-xs tracking-[0.4em] hover:bg-zinc-800 transition-all uppercase italic">Join Now</button>
          </div>
        </div>
      </section>

      <section className={`py-40 px-6 md:px-12 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-24">
          <aside className="lg:col-span-4">
            <div className="sticky top-32">
              <h3 className="mb-8 font-black leading-[1] text-6xl md:text-[80px] italic tracking-tighter uppercase">Archive<br />Of Letter.</h3>
              <ul className={`space-y-8 border-t pt-12 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                {CATEGORIES.map((c) => (
                  <li key={c.key} className="group">
                    <button className="text-2xl md:text-3xl font-black italic transition-all hover:text-[#004aad] opacity-30 group-hover:opacity-100 uppercase">{c.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <div className="lg:col-span-8">
            <div className="py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-[4rem]">
              <p className="text-4xl font-black italic text-zinc-200 dark:text-zinc-800 uppercase tracking-tighter mb-4 italic">No Letters Found.</p>
              <p className="text-xs font-bold text-zinc-400 tracking-widest uppercase italic">기록을 불러오고 있습니다. 에디터에서 첫 글을 발행해보세요.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- 📄 About Page (완벽 복구!) ---
const AboutPage = ({ isDarkMode }) => (
  <div className="animate-in fade-in duration-1000 bg-white dark:bg-black overflow-hidden">
    <section className="relative h-screen w-full flex items-center justify-center">
      <StreamingTextBackground />
      <div className="relative z-10 text-center px-6">
        <span className="inline-block mb-8 px-6 py-2 border border-black dark:border-white text-[10px] font-black tracking-[0.5em] uppercase italic">Publishing Unit</span>
        <h2 className="text-9xl md:text-[16rem] font-black italic tracking-tighter leading-none mb-10 text-black dark:text-white uppercase transition-all">U<span className="text-[#004aad]">#</span></h2>
        <p className="text-xl md:text-2xl font-light tracking-widest max-w-3xl mx-auto leading-relaxed text-zinc-400 italic">#은 에디션이자 해시태그를 의미하며,<br />우리의 모든 기록은 고유한 번호를 부여받아 역사로 축적됩니다.</p>
      </div>
    </section>

    <section className="py-40 px-6 max-w-5xl mx-auto">
      <p className="text-[#004aad] font-black italic text-xs tracking-widest mb-4 uppercase">Statement. 01</p>
      <h3 className={`text-5xl md:text-7xl font-black italic mb-16 leading-[0.85] uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>기록하는 갤러리,<br />언프레임 독립출판 'U#'</h3>
      <div className="space-y-16 text-2xl md:text-3xl leading-loose font-light italic">
        <p className={isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}>예술은 완성된 결과만으로 존재하지 않고, 그 이전에 머물렀던 <span className="bg-[#004aad]/10 dark:bg-[#004aad]/20 px-2 font-black text-[#004aad]">질문과 감각</span>들이 서로 엮이며 하나의 흐름을 이룹니다.</p>
        <p className={isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}>이 기록은 전시를 함께 경험하는 또 다른 방식의 대화가 되어 <span className="text-black dark:text-white font-black italic underline decoration-[#004aad] decoration-4 underline-offset-8">관객과 자연스럽게 이어집니다.</span></p>
      </div>
    </section>

    <section className="py-40 bg-zinc-50 dark:bg-zinc-950 border-y border-zinc-100 dark:border-zinc-900">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8">
        {[
          { id: "01", title: "전시 그 이면의 생각", desc: "U#은 독립출판의 형식을 통해 전시의 과정과 그 이면의 생각을 기록합니다. 완성된 작품 뒤에 숨겨진 작가의 고뇌를 책에 담습니다." },
          { id: "02", title: "디렉터의 정기 소통", desc: "디렉터가 전시 및 프로젝트와 관련된 과정을 직접 담아내며 정기적으로 관객과 소통합니다. 현장의 생생한 목소리를 전달합니다." },
          { id: "03", title: "관람객 방명록 리캡", desc: "전시를 찾은 관객들의 소중한 피드백을 리캡 형식으로 담아냅니다. 관객의 시선이 더해져 비로소 하나의 역사가 완성됩니다." },
          { id: "Vision", title: "쌓이는 역사", desc: "빠르게 소비되지 않는, 다시 읽고 참고할 수 있는 기록을 남김으로써 우리의 역사는 넓어지고 깊게 쌓입니다." },
        ].map((f, i) => (
          <div key={i} className={`p-16 border transition-all hover:translate-y-[-10px] rounded-[2rem] ${isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-2xl' : 'bg-white border-zinc-100 shadow-xl'}`}>
            <span className="text-[#004aad] italic font-black text-xs mb-4 block uppercase tracking-widest">{f.id === 'Vision' ? 'Vision' : `Feature. ${f.id}`}</span>
            <h4 className="text-3xl font-black mb-6 italic uppercase">{f.title}</h4>
            <p className="text-zinc-500 leading-relaxed font-light italic">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

// 나머지 페이지(EditorPage, MyPage, ViewPage)는 이전 로직 유지

// =========================================================================
// 🧩 [PART 4] Main Application Logic
// =========================================================================

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(height === 0 ? 0 : (winScroll / height) * 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <Router>
      <ScrollToTop />
      <div className={`min-h-screen font-sans transition-all duration-700 selection:bg-[#004aad] selection:text-white ${isDarkMode ? 'bg-black text-white dark' : 'bg-white text-black'}`}>
        
        {/* Background Grid */}
        <div className={`fixed inset-0 pointer-events-none transition-opacity duration-700 ${isDarkMode ? 'opacity-[0.01]' : 'opacity-[0.03]'}`} style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

        <Navbar toggleTheme={toggleTheme} isDarkMode={isDarkMode} user={user} onLogin={handleLogin} onLogout={handleLogout} />

        <main className="relative">
          <Routes>
            <Route path="/" element={<HomePage isDarkMode={isDarkMode} />} />
            <Route path="/about" element={<AboutPage isDarkMode={isDarkMode} />} />
            {/* 나머지 경로들... */}
          </Routes>
        </main>

        <GlobalFooter />
      </div>
    </Router>
  );
}