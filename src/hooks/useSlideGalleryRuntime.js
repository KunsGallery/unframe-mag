import { useEffect } from "react";

export function slideOffsets(track) {
  const slides = Array.from(track.querySelectorAll(".uf-slide-gallery__slide"));
  const origin = slides[0]?.getBoundingClientRect().left ?? 0;
  return slides.map((slide) => slide.getBoundingClientRect().left - origin);
}

export function nearestSlideIndex(offsets, scrollLeft) {
  return offsets.reduce((nearest, offset, index) =>
    Math.abs(offset - scrollLeft) < Math.abs(offsets[nearest] - scrollLeft)
      ? index : nearest, 0);
}

export function slideTargetOffset(offsets, index) {
  if (!offsets.length) return 0;
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  return offsets[Math.max(0, Math.min(offsets.length - 1, safeIndex))];
}

// Pass a ref enclosing EditorContent; readiness changes attach after loading screens.
export function useSlideGalleryRuntime(containerRef, readiness) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;
    const view = root.ownerDocument.defaultView;
    const motion = view.matchMedia("(prefers-reduced-motion: reduce)");
    const tracks = new Map();
    let frame = 0;
    let disposed = false;

    const update = (track) => {
      const offsets = slideOffsets(track);
      const index = nearestSlideIndex(offsets, track.scrollLeft);
      tracks.set(track, index);
      const gallery = track.closest(".uf-slide-gallery");
      gallery.querySelectorAll(".uf-slide-gallery__dot").forEach((dot, i) => {
        dot.setAttribute("data-active", String(i === index));
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
      const counter = gallery.querySelector(".uf-slide-gallery__counter");
      if (counter) {
        const current = offsets.length ? index + 1 : 0;
        counter.dataset.current = String(current);
        counter.dataset.total = String(offsets.length);
        const text = `${current} / ${offsets.length}`;
        if (counter.textContent !== text) counter.textContent = text;
      }
      gallery.querySelectorAll(".uf-slide-gallery__arrow").forEach((arrow) => {
        arrow.disabled = offsets.length < 2;
      });
    };
    const go = (track, index, behavior = motion.matches ? "instant" : "smooth") => {
      track.scrollTo({ left: slideTargetOffset(slideOffsets(track), index), behavior });
    };
    const resize = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => {
        if (tracks.has(target)) go(target, tracks.get(target), "instant");
      });
      schedule();
    });
    const refresh = () => {
      frame = 0;
      if (disposed) return;
      const present = new Set(root.querySelectorAll(".uf-slide-gallery__track"));
      tracks.forEach((_, track) => {
        if (!present.has(track)) { resize.unobserve(track); tracks.delete(track); }
      });
      present.forEach((track) => {
        if (!tracks.has(track)) resize.observe(track);
        update(track);
      });
    };
    function schedule() {
      if (!disposed && !frame) frame = view.requestAnimationFrame(refresh);
    }
    const click = (event) => {
      const button = event.target.closest?.(".uf-slide-gallery__arrow, .uf-slide-gallery__dot");
      if (!button || !root.contains(button)) return;
      const track = button.closest(".uf-slide-gallery")?.querySelector(".uf-slide-gallery__track");
      if (!track) return;
      event.preventDefault();
      const offsets = slideOffsets(track);
      if (!offsets.length) return;
      const current = nearestSlideIndex(offsets, track.scrollLeft);
      const index = button.matches(".uf-slide-gallery__dot")
        ? Number(button.dataset.index)
        : (current + (button.dataset.dir === "next" ? 1 : -1) + offsets.length) % offsets.length;
      go(track, index);
      schedule();
    };
    const scroll = (event) => {
      if (event.target.matches?.(".uf-slide-gallery__track")) schedule();
    };
    const motionChange = () => {
      if (motion.matches) tracks.forEach((_, track) =>
        go(track, nearestSlideIndex(slideOffsets(track), track.scrollLeft), "instant"));
      schedule();
    };
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true });
    root.addEventListener("click", click, true);
    root.addEventListener("scroll", scroll, true);
    motion.addEventListener("change", motionChange);
    schedule();
    return () => {
      disposed = true;
      view.cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      root.removeEventListener("click", click, true);
      root.removeEventListener("scroll", scroll, true);
      motion.removeEventListener("change", motionChange);
    };
  }, [containerRef, readiness]);
}
