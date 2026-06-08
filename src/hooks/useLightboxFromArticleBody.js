import { useEffect, useState } from "react";

export function useLightboxFromArticleBody(bodyRef) {
  const [lightbox, setLightbox] = useState(null);

	useEffect(() => {
		const root = bodyRef?.current;
		if (!root) return;

		const onClick = (e) => {
			const img = e.target?.closest?.("img");
			if (!img) return;

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

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [bodyRef]);

  return { lightbox, setLightbox };
}
