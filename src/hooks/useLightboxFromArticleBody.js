import { useEffect, useState } from "react";

export function useLightboxFromArticleBody(bodyRef) {
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const root = bodyRef?.current;
    if (!root) return undefined;

    const onClickCapture = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('button, a, [data-lightbox-ignore="true"]')) return;

      const img = target.closest("img");
      if (!img) return;
      if (img.closest('button, a, [data-lightbox-ignore="true"]')) return;

      const src =
        img.dataset?.originalSrc ||
        img.dataset?.src ||
        img.currentSrc ||
        img.getAttribute("src") ||
        img.src;
      if (!src) return;

      const alt = img.getAttribute("alt") || "";
      const caption = img.getAttribute("data-caption") || alt || null;

      setLightbox({ src, alt, caption });
    };

    root.addEventListener("click", onClickCapture, true);
    return () => root.removeEventListener("click", onClickCapture, true);
  }, [bodyRef]);

  return { lightbox, setLightbox };
}
