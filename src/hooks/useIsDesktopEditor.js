import { useEffect, useState } from "react";

export function useIsDesktopEditor() {
  const [isDesktopEditor, setIsDesktopEditor] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopEditor(media.matches);

    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  return isDesktopEditor;
}
