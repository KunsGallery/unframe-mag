import React, { useMemo } from 'react';

const StreamingText = () => {
  // 1. 스트리밍 설정 (마스터플랜 및 기존 코드 기반)
  const config = {
    count: 25,             // 화면에 표시될 텍스트 줄 수
    minSpeed: 40,          // 최소 속도 (초)
    maxSpeed: 100,         // 최대 속도 (초)
    minFontSize: 40,       // 최소 크기 (px)
    maxFontSize: 140,      // 최대 크기 (px)
  };

  // 2. 랜덤 데이터 생성 (컴포넌트 리렌더링 시 값이 변하지 않도록 useMemo 사용)
  const streams = useMemo(() => {
    return Array.from({ length: config.count }).map((_, i) => {
      const num = Math.floor(Math.random() * 999) + 1;
      const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
      const fontSize = config.minFontSize + Math.random() * (config.maxFontSize - config.minFontSize);
      const top = Math.random() * 90; // 상단 위치 (0% ~ 90%)
      const delay = Math.random() * -config.maxSpeed; // 시작 시점 분산

      return {
        id: i,
        text: `#${String(num).padStart(3, '0')}`,
        style: {
          top: `${top}%`,
          fontSize: `${fontSize}px`,
          animationDuration: `${speed}s`,
          animationDelay: `${delay}s`,
        }
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      {/* 전역 애니메이션 Keyframe 주입 */}
      <style>
        {`
          @keyframes streamLeft {
            from { transform: translateX(100vw); }
            to { transform: translateX(-150%); }
          }
          .animate-stream {
            animation-name: streamLeft;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }
        `}
      </style>

      {streams.map((stream) => (
        <div
          key={stream.id}
          className="absolute whitespace-nowrap font-black italic opacity-[0.4] text-[#004aad] dark:text-zinc-800 animate-stream"
          style={stream.style}
        >
          {stream.text}
        </div>
      ))}
    </div>
  );
};

export default StreamingText;