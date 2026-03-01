import { useEffect } from "react";

export function useRevealOnce(containerRef, deps = []) {
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) return;

    const root = containerRef?.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const targets = root.querySelectorAll("p, h2, h3, figure, section, blockquote, ul, ol");
    targets.forEach((el) => {
      el.classList.add("uf-reveal");
      io.observe(el);
    });

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}