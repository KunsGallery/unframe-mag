import { useEffect, useState } from "react";

export function useLightboxFromArticleBody(bodyRef) {
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const root = bodyRef?.current;
    if (!root) return;

    const onClick = (e) => {
      const img = e.target?.closest?.("img");
      if (!img) return;

      const src = img.getAttribute("src");
      if (!src) return;

      const caption =
        img.getAttribute("alt") ||
        img.getAttribute("data-caption") ||
        null;

      setLightbox({ src, caption });
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [bodyRef]);

  return { lightbox, setLightbox };
}