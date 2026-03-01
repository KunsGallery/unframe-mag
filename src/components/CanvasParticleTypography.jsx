// src/components/CanvasParticleTypography.jsx
import React, { useEffect, useRef } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function CanvasParticleTypography({
  text = "U#",
  color = "#004aad",
  density = 6, // 낮을수록 파티클 많아짐(=더 무거움). 6~10 추천
  radius = 1.2,
  drift = 0.22, // 움직임 강도(과하면 저급해 보임 → 0.15~0.3)
  mouseForce = 0.08, // 마우스 반응(미세)
  className = "",
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduce = prefersReducedMotion();
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * DPR);
      canvas.height = Math.floor(height * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildParticles(width, height);
      render(width, height, true); // 한 번 그리기
    };

    const buildParticles = (w, h) => {
      // offscreen에서 텍스트를 찍고 픽셀 샘플링
      const off = document.createElement("canvas");
      off.width = Math.floor(w);
      off.height = Math.floor(h);
      const octx = off.getContext("2d");
      if (!octx) return;

      octx.clearRect(0, 0, w, h);

      // 하이엔드 느낌: 굵은 이탤릭
      const fontSize = Math.min(w, h) * 0.42;
      octx.font = `900 italic ${fontSize}px Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#000";
      octx.fillText(text, w * 0.5, h * 0.48);

      const img = octx.getImageData(0, 0, w, h).data;
      const pts = [];
      const step = density;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const a = img[idx + 3];
          if (a > 20) {
            pts.push({
              x,
              y,
              ox: x,
              oy: y,
              vx: 0,
              vy: 0,
              r: radius + Math.random() * 0.6,
            });
          }
        }
      }
      particlesRef.current = pts;
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const onLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    const render = (w, h, once = false) => {
      ctx.clearRect(0, 0, w, h);

      // 아주 약한 그레인 느낌(점들로)
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = color;
      for (let i = 0; i < 120; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      const pts = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // 파티클
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;

      for (const p of pts) {
        if (!reduce && !once) {
          // 미세 드리프트(원점으로 돌아오려는 스프링)
          const dx0 = p.ox - p.x;
          const dy0 = p.oy - p.y;

          p.vx += dx0 * 0.0025;
          p.vy += dy0 * 0.0025;

          // 마우스 반발(미세)
          const dxm = p.x - mx;
          const dym = p.y - my;
          const dist2 = dxm * dxm + dym * dym;
          if (dist2 < 140 * 140) {
            p.vx += (dxm / (Math.sqrt(dist2) + 0.001)) * mouseForce;
            p.vy += (dym / (Math.sqrt(dist2) + 0.001)) * mouseForce;
          }

          // 감쇠 + 이동
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.x += p.vx * drift;
          p.y += p.vy * drift;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 살짝 블러 느낌을 캔버스에서 직접 주기 어렵기 때문에 opacity로만 “잉크감” 조절
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      const { width, height } = canvas.getBoundingClientRect();
      render(width, height);
      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    if (!prefersReducedMotion()) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, color, density, radius, drift, mouseForce]);

  return <canvas ref={canvasRef} className={className} />;
}