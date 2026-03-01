// src/hooks/useSlashMenu.js
import { useCallback, useState } from "react";

export function useSlashMenu() {
  const [slashPos, setSlashPos] = useState(null);

  const closeSlashMenu = useCallback(() => setSlashPos(null), []);

  const onEditorKeyDown = useCallback((editor, event) => {
    if (event.key === "Escape") {
      closeSlashMenu();
      return false;
    }

    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      requestAnimationFrame(() => {
        try {
          if (!editor?.view) return;
          const pos = editor.state.selection.from;
          const coords = editor.view.coordsAtPos(pos);
          setSlashPos({ x: coords.left, y: coords.bottom + 8 });
        } catch {
          // ignore
        }
      });
      return false; // '/' 입력은 그대로 들어가게 둠
    }

    return false;
  }, [closeSlashMenu]);

  return { slashPos, setSlashPos, closeSlashMenu, onEditorKeyDown };
}