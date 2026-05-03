import { useEffect } from "react";
import {
  getParallaxMotionSpeed,
  PARALLAX_DEFAULTS,
} from "../constants/editorBlocks";

function clampMotion(value) {
  return Math.min(Math.max(value, 0.04), 0.34);
}

/**
 * High-end Parallax runtime
 * - uses requestAnimationFrame loop
 * - inertia (lerp) for smoothness
 * - reads node attrs:
 *   - data-speed (0.05~0.6) optional
 *   - data-motion-preset optional
 * - optional debug: set window.__UF_PARALLAX_DEBUG__ = true
 */
export function useParallaxRuntime(deps = []) {
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) return;

    const DEBUG = !!window.__UF_PARALLAX_DEBUG__;

    // 캐시(성능)
    let items = [];
    let rafId = 0;

    // 관성용 현재값
    const state = new Map(); // img -> currentY

    const collect = () => {
      items = Array.from(document.querySelectorAll('[data-uf="parallax"]'))
        .map((fig) => {
          const img = fig.querySelector(".uf-parallax__img");
          if (!img) return null;

          // speed: attrs.speed가 HTML에 직렬화되면 data-speed나 speed로 올 수 있음
          // 기존 글 호환을 위해 speed가 있으면 우선 사용하고,
          // 없을 때만 motionPreset 매핑값을 fallback 한다.
          const speedAttr =
            fig.getAttribute("data-speed") ||
            fig.getAttribute("speed") ||
            fig.getAttribute("data-parallax-speed");
          const motionPresetAttr =
            fig.getAttribute("data-motion-preset") ||
            fig.getAttribute("motionpreset") ||
            fig.getAttribute("motionPreset");

          const speed = speedAttr ? Number(speedAttr) : NaN;
          const presetSpeed = getParallaxMotionSpeed(
            motionPresetAttr,
            PARALLAX_DEFAULTS.speed
          );
          const resolvedSpeed = Number.isFinite(speed) ? speed : presetSpeed;
          const clamped = clampMotion(
            Number.isFinite(resolvedSpeed)
              ? resolvedSpeed
              : PARALLAX_DEFAULTS.speed
          );

          // 처음 상태 초기화
          if (!state.has(img)) state.set(img, 0);

          return { fig, img, speed: clamped };
        })
        .filter(Boolean);

      if (DEBUG) {
        console.log("[UF] parallax items:", items.length, items);
      }
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      const vH = window.innerHeight || 1;

      for (const it of items) {
        const { fig, img, speed } = it;
        const rect = fig.getBoundingClientRect();

        // 화면 근처에서만 업데이트
        if (rect.bottom < -250 || rect.top > vH + 250) continue;

        // 0~1 진행률
        const progress = (rect.top + rect.height) / (vH + rect.height);
        const centered = (0.5 - progress) * 2; // -1~1

        // speed=0.12 => 약 48px. 과한 이동보다 이미지 안정감을 우선한다.
        const strength = 400 * speed;
        const targetY = -centered * strength;

        const current = state.get(img) ?? 0;
        const next = lerp(current, targetY, 0.10); // 관성(0.08~0.14 추천)
        state.set(img, next);

        img.style.transform = `translate3d(0, calc(-50% + ${next}px), 0)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    // 최초 수집 + DOM 변동 대응 (TipTap 렌더 후 바뀔 수 있음)
    collect();

    const mo = new MutationObserver(() => {
      // 패럴랙스 블록이 추가/삭제되면 재수집
      collect();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const onResize = () => collect();
    window.addEventListener("resize", onResize);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      mo.disconnect();
      state.clear();
      items = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
