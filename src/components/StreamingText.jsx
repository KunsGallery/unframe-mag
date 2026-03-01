// src/components/StreamingText.jsx
import React, { useMemo } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// seed 기반 랜덤(새로고침마다 톤이 크게 흔들리지 않게)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * hole 옵션:
 * - hero 중앙에 큰 타이포(U#)가 있을 때, 그 영역을 비워 “실루엣 중심” 느낌을 만듦(2차 단계)
 * - hole = { x: 50, y: 45, w: 46, h: 46 }  (% 기준)
 */
export default function StreamingText({
  countDesktop = 26,
  countMobile = 13,
  minSpeed = 30,
  maxSpeed = 90,
  minFontSize = 19,
  maxFontSize = 130,
  opacity = 0.1,
  color = "#004aad",
  hole = null,
}) {
  const reduce = prefersReducedMotion();

  const streams = useMemo(() => {
    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const count = isMobile ? countMobile : countDesktop;

    const rand = mulberry32(23023);

    const inHole = (topPct) => {
      if (!hole) return false;
      // hole은 (x,y,w,h)인데 스트림은 y(top)만 쓰므로 y 범위만 우선 체크
      // (원하면 x도 랜덤으로 주고 x 범위도 체크 가능)
      const y1 = hole.y - hole.h / 2;
      const y2 = hole.y + hole.h / 2;
      return topPct >= y1 && topPct <= y2;
    };

    return Array.from({ length: count }).map((_, i) => {
      const num = Math.floor(rand() * 999) + 1;
      const speed = minSpeed + rand() * (maxSpeed - minSpeed);
      const fontSize = minFontSize + rand() * (maxFontSize - minFontSize);

      // 중앙 홀을 피해서 배치(2차 단계)
      let top = rand() * 92;
      if (hole) {
        let guard = 0;
        while (inHole(top) && guard < 50) {
          top = rand() * 92;
          guard++;
        }
      }

      const delay = rand() * -maxSpeed;
      const tail = rand() > 0.55 ? "" : "";

      return {
        id: i,
        text: `#${String(num).padStart(3, "0")}${tail}`,
        style: {
          top: `${top}%`,
          fontSize: `${fontSize}px`,
          animationDuration: `${speed}s`,
          animationDelay: `${delay}s`,
        },
      };
    });
  }, [countDesktop, countMobile, minSpeed, maxSpeed, minFontSize, maxFontSize, hole]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      <style>
        {`
          @keyframes streamLeft {
            from { transform: translateX(110vw); }
            to { transform: translateX(-220%); }
          }
          .animate-stream {
            animation-name: streamLeft;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-stream { animation: none !important; }
          }
        `}
      </style>

      {streams.map((stream) => (
        <div
          key={stream.id}
          className="absolute whitespace-nowrap font-black italic tracking-tighter uppercase animate-stream"
          style={{
            ...stream.style,
            opacity,
            color,
            filter: "blur(0.35px) saturate(0.95)",
            mixBlendMode: "multiply",
            textShadow: `0 0 18px rgba(0, 74, 173, 0.08)`,
          }}
        >
          {stream.text}
        </div>
      ))}
    </div>
  );
}