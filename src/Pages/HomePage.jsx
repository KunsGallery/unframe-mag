import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Trophy, Clock, Instagram, Mail } from 'lucide-react';

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // 1. 히어로 슬라이드 데이터 (이주의 아티클, 에디터 픽 등)
  const heroSlides = [
    {
      id: 1,
      category: "WEEKLY BEST",
      title: "프레임을 깨는 순간,\n새로운 감각이 깨어난다",
      description: "인사동 108호에서 만나는 언프레임의 첫 번째 기록.",
      image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2000",
      color: "text-[#004aad]"
    },
    {
      id: 2,
      category: "EDITOR'S PICK",
      title: "U#이 주목한\n이달의 아티스트: 김재우",
      description: "정형화된 예술의 틀을 거부하는 그의 작업 세계 속으로.",
      image: "https://images.unsplash.com/photo-1554188248-986adbb73be4?q=80&w=2000",
      color: "text-white"
    },
    {
      id: 3,
      category: "NEW ARCHIVE",
      title: "디지털 매거진이\n예술을 수집하는 방법",
      description: "NFC와 스티커북으로 완성되는 나만의 컬렉션.",
      image: "https://images.unsplash.com/photo-1501084817091-a4f3d1d19e07?q=80&w=2000",
      color: "text-white"
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  // 2. 랭킹 데이터 (마스터플랜 기반)
  const rankings = {
    editors: [
      { name: "ArtCollector_99", score: "2,450 pts", rank: 1 },
      { name: "Unframe_Life", score: "2,100 pts", rank: 2 },
      { name: "Studio_K", score: "1,850 pts", rank: 3 },
    ],
    collectors: [
      { name: "스티커왕", count: "48 stickers", rank: 1 },
      { name: "인사동주민", count: "42 stickers", rank: 2 },
      { name: "예술매니아", count: "35 stickers", rank: 3 },
    ],
    readers: [
      { name: "심해독자", time: "124h", rank: 1 },
      { name: "매일읽는사람", time: "98h", rank: 2 },
      { name: "기록가", time: "85h", rank: 3 },
    ]
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-950 transition-colors duration-300">
      
      {/* --- HERO SECTION: SLIDE GALLERY --- */}
      <section className="relative h-screen w-full overflow-hidden bg-zinc-100">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div className="absolute inset-0 bg-black/20 z-[1]" />
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            
            <div className="absolute inset-0 z-[2] flex flex-col justify-center px-10 md:px-24">
              <span className="text-sm md:text-base font-black tracking-[0.3em] mb-4 text-white/80 drop-shadow-md">
                {slide.category}
              </span>
              <h1 className={`text-5xl md:text-8xl font-black italic tracking-tighter leading-[1.1] mb-6 whitespace-pre-line drop-shadow-lg ${slide.color}`}>
                {slide.title}
              </h1>
              <p className="text-lg md:text-xl text-white font-medium max-w-2xl drop-shadow-md opacity-90">
                {slide.description}
              </p>
              <div className="mt-10">
                <button className="px-8 py-4 bg-white dark:bg-zinc-900 text-black dark:text-white font-black text-sm tracking-widest hover:bg-[#004aad] hover:text-white transition-all transform hover:-translate-y-1">
                  VIEW ARTICLE
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Controls */}
        <div className="absolute bottom-10 right-10 z-20 flex gap-4">
          <button onClick={prevSlide} className="p-3 bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white hover:text-black transition-all">
            <ChevronLeft size={24} />
          </button>
          <button onClick={nextSlide} className="p-3 bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white hover:text-black transition-all">
            <ChevronRight size={24} />
          </button>
        </div>
      </section>

      {/* --- RANKING SECTION --- */}
      <section className="py-24 px-10 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
          <div>
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-[#004aad] dark:text-white">
              U# RANKING
            </h2>
            <p className="text-zinc-500 mt-2 font-medium tracking-wide">실시간으로 업데이트되는 유샵의 창작자와 독자들</p>
          </div>
          <div className="text-sm font-bold tracking-widest text-zinc-400">UPDATED: FEB 2026</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Editor Ranking */}
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl transition-transform hover:-translate-y-2">
            <div className="flex items-center gap-3 mb-8 text-[#004aad]">
              <TrendingUp size={24} />
              <h3 className="text-xl font-black italic">BEST EDITORS</h3>
            </div>
            <div className="space-y-6">
              {rankings.editors.map((item) => (
                <div key={item.rank} className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black italic opacity-30 italic">{item.rank}</span>
                    <span className="font-bold dark:text-zinc-200">{item.name}</span>
                  </div>
                  <span className="text-xs font-black px-2 py-1 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Collector Ranking */}
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl transition-transform hover:-translate-y-2">
            <div className="flex items-center gap-3 mb-8 text-[#004aad]">
              <Trophy size={24} />
              <h3 className="text-xl font-black italic">TOP COLLECTORS</h3>
            </div>
            <div className="space-y-6">
              {rankings.collectors.map((item) => (
                <div key={item.rank} className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black italic opacity-30">{item.rank}</span>
                    <span className="font-bold dark:text-zinc-200">{item.name}</span>
                  </div>
                  <span className="text-xs font-black px-2 py-1 bg-[#004aad] text-white rounded">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reader Ranking */}
          <div className="p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl transition-transform hover:-translate-y-2">
            <div className="flex items-center gap-3 mb-8 text-[#004aad]">
              <Clock size={24} />
              <h3 className="text-xl font-black italic">DEEP READERS</h3>
            </div>
            <div className="space-y-6">
              {rankings.readers.map((item) => (
                <div key={item.rank} className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black italic opacity-30">{item.rank}</span>
                    <span className="font-bold dark:text-zinc-200">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold dark:text-zinc-400">{item.time} STAYED</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- SUBSCRIBE SECTION --- */}
      <section className="py-20 bg-[#004aad] text-white overflow-hidden relative">
        <div className="max-w-[1400px] mx-auto px-10 flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="mb-10 md:mb-0">
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter mb-4 leading-none">
              STAY TUNED,<br />UNFRAME YOUR VIEW.
            </h2>
            <p className="opacity-80 font-medium tracking-wide">격주로 발행되는 U#의 새로운 아티클을 메일함에서 만나보세요.</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="email" 
              placeholder="E-MAIL ADDRESS" 
              className="bg-transparent border-b-2 border-white/50 px-4 py-3 outline-none focus:border-white w-full md:w-80 font-bold placeholder:text-white/40"
            />
            <button className="p-4 bg-white text-[#004aad] hover:bg-zinc-100 transition-colors">
              <Mail size={24} />
            </button>
          </div>
        </div>
        {/* Decorative background text */}
        <div className="absolute -bottom-10 -right-10 text-[18rem] font-black italic opacity-5 select-none pointer-events-none tracking-tighter">
          U#
        </div>
      </section>

      {/* --- INSTAGRAM WIDGET SECTION --- */}
      <section className="py-24 px-10 max-w-[1400px] mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-12">
          <Instagram size={28} className="text-[#004aad] dark:text-white" />
          <h2 className="text-2xl font-black tracking-[0.2em] dark:text-white">UNFRAME_INSADONG</h2>
        </div>
        
        {/* 가상의 인스타그램 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-zinc-100 dark:bg-zinc-900 overflow-hidden group relative">
              <img 
                src={`https://images.unsplash.com/photo-1541${i}000000000?q=80&w=800`} 
                alt="Instagram" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Instagram size={24} className="text-white" />
              </div>
            </div>
          ))}
        </div>
        <a 
          href="https://www.instagram.com/unframe.kr" 
          target="_blank" 
          className="inline-block mt-12 text-sm font-black border-b-2 border-[#004aad] dark:border-white pb-1 tracking-widest dark:text-white"
        >
          FOLLOW OUR MOMENT
        </a>
      </section>

    </div>
  );
};

export default HomePage;