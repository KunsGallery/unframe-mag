import React, { useEffect, useRef } from 'react';
import { Zap, Layers, ArrowRight, Bell, MapPin, Info, ShieldCheck } from 'lucide-react';
import StreamingText from '../components/StreamingText';

const AboutPage = () => {
  // 스크롤 애니메이션 (Reveal 효과) 관찰자 설정
  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#1a1a1a] font-sans selection:bg-[#004aad]/10 selection:text-[#004aad]">
      {/* 배경 그리드 패턴 */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* --- [섹션 1] HERO: 스트리밍 텍스트 배경 --- */}
      <section className="relative h-screen flex flex-col justify-center items-center overflow-hidden border-b border-zinc-100">
        <div className="absolute inset-0 z-0 opacity-10">
          <StreamingText />
        </div>
        
        <div className="relative z-10 text-center px-6 reveal transition-all duration-1000 transform opacity-0 translate-y-10">
          <span className="inline-block mb-6 px-4 py-1 border border-black text-[10px] font-black tracking-[0.4em] uppercase">
            Publishing Unit
          </span>
          <h1 className="text-[120px] md:text-[180px] font-black leading-none mb-8 tracking-tighter italic">
            U<span className="text-[#004aad]">#</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-2xl font-medium text-zinc-500 leading-relaxed break-keep">
            #은 에디션이자 해시태그를 의미하며,<br />
            우리의 모든 기록은 고유한 번호를 부여받아 역사로 축적됩니다.
          </p>
        </div>
      </section>

      {/* --- [섹션 2] PHILOSOPHY: 기록하는 갤러리 --- */}
      <section className="py-32 px-6 bg-white relative z-10">
        <div className="max-w-[800px] mx-auto reveal transition-all duration-1000 transform opacity-0 translate-y-10">
          <span className="text-[#004aad] font-serif italic text-sm mb-4 block">Statement. 01</span>
          <h2 className="text-4xl md:text-6xl font-black mb-12 leading-[1.2] tracking-tighter break-keep">
            기록하는 갤러리<br />언프레임 독립출판 'U#'
          </h2>
          
          <div className="space-y-8 text-xl md:text-2xl text-zinc-600 leading-loose break-keep font-light">
            <p>
              예술은 완성된 결과만으로 존재하지 않고, 그 이전에 머물렀던 
              <span className="relative inline-block px-1 font-bold text-black z-10">
                질문과 감각
                <span className="absolute bottom-1 left-0 w-full h-3 bg-[#004aad]/10 -z-10" />
              </span>들이 서로 엮이며 하나의 흐름을 이룹니다.
            </p>
            <p>
              U#은 독립출판의 형식을 통해 전시의 과정과 그 이면의 생각을 기록하며, 
              이 기록은 관객과 자연스럽게 이어지는 대화가 됩니다.
            </p>
            <p className="text-zinc-400 text-lg">
              디렉터가 전시의 과정을 직접 담아 정기적으로 소통하고, 관람객의 방명록을 리캡하여 전시 현장의 경험을 간직할 수 있도록 합니다.
            </p>
          </div>
        </div>
      </section>

      {/* --- [섹션 3] FEATURES: 핵심 가치 카드 --- */}
      <section className="py-32 bg-[#fcfcfc] relative z-10">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-8">
          {[
            { no: "01", title: "전시 그 이면의 생각", desc: "독립출판의 형식을 통해 전시의 과정과 이면의 고뇌를 기록합니다." },
            { no: "02", title: "디렉터의 정기 소통", desc: "기획자가 직접 제작 과정과 비하인드 스토리를 담아 관객과 대화합니다." },
            { no: "03", title: "관람객 방명록 리캡", desc: "전시를 완성하는 관객의 시선을 다시 엮어 하나의 역사로 기록합니다." },
            { no: "Vision", title: "쌓이는 역사", desc: "빠르게 소비되지 않는, 다시 읽고 참고할 수 있는 기록을 남깁니다." }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="reveal transition-all duration-700 delay-[200ms] transform opacity-0 translate-y-10 bg-white border border-zinc-100 p-12 hover:border-[#004aad] hover:-translate-y-2 transition-all group"
            >
              <span className="text-[#004aad] font-serif italic text-sm mb-4 block">Feature. {item.no}</span>
              <h4 className="text-2xl font-bold mb-6 group-hover:text-[#004aad] transition-colors">{item.title}</h4>
              <p className="text-zinc-500 leading-relaxed break-keep">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- [섹션 4] EDITORIAL VISION: 디지털에서 아카이브로 --- */}
      <section className="py-32 bg-white relative z-10 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div className="reveal transition-all duration-1000 transform opacity-0 translate-y-10">
            <span className="text-[#004aad] font-serif italic text-sm mb-4 block">Editorial Vision</span>
            <h3 className="text-4xl md:text-5xl font-black mb-10 tracking-tighter leading-tight">
              웹 매거진에서<br />영원한 기록으로.
            </h3>
            <p className="text-lg text-zinc-600 mb-12 leading-relaxed break-keep">
              U#은 유연한 <b>디지털 매거진</b> 형태로 먼저 관객을 만납니다. 
              온라인에서 정제된 기록들은 향후 피지컬 에디션으로 다시 태어나 우리 곁에 영원히 머뭅니다.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="bg-[#004aad] text-white p-2 h-fit rounded"><Zap size={18} /></div>
                <div>
                  <h5 className="font-bold">실시간 전시 아카이빙</h5>
                  <p className="text-sm text-zinc-400">전시 비하인드 스토리를 실시간으로 업데이트합니다.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-[#004aad] text-white p-2 h-fit rounded"><Layers size={18} /></div>
                <div>
                  <h5 className="font-bold">인터랙티브 콘텐츠</h5>
                  <p className="text-sm text-zinc-400">영상과 입체적 기록을 통해 예술을 경험합니다.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="reveal transition-all duration-1000 delay-300 transform opacity-0 translate-y-10">
            <div className="border-2 border-black p-4 bg-white shadow-[20px_20px_0px_0px_rgba(0,74,173,0.1)]">
              <div className="bg-zinc-50 aspect-[16/10] p-10 flex flex-col">
                <span className="text-[10px] font-black text-[#004aad] tracking-widest uppercase mb-4">Web Magazine Preview</span>
                <h4 className="text-3xl font-black italic tracking-tighter mb-4 leading-none">The Unseen Layers<br />of Arts.</h4>
                <div className="flex-1 border-y border-zinc-200 my-6 flex items-center justify-center italic text-zinc-300">Preview Area</div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>ISSUE #001</span>
                  <span className="animate-pulse">SCROLL TO DISCOVER</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- [섹션 5] CTA --- */}
      <section className="py-40 text-center relative z-10">
        <div className="reveal transition-all duration-1000 transform opacity-0 translate-y-10">
          <div className="w-20 h-[1px] bg-black mx-auto mb-12" />
          <h3 className="text-3xl md:text-5xl font-black mb-16 uppercase tracking-widest italic">The History is Expanding.</h3>
          <a 
            href="https://www.instagram.com/unframe.kr" 
            target="_blank"
            className="inline-flex items-center gap-4 bg-[#004aad] text-white px-10 py-5 rounded-full font-bold hover:bg-black transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            최신 소식 받아보기 (Instagram) <ArrowRight size={20} />
          </a>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;