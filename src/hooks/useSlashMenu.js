// src/hooks/useSlashMenu.js
import { useCallback, useState } from "react";

export function useSlashMenu() {
  const [slashPos, setSlashPos] = useState(null);

  const closeSlashMenu = useCallback(() => setSlashPos(null), []);

  const removeTrailingSlash = useCallback((editor) => {
    try {
      if (!editor?.state) return;
      const { from } = editor.state.selection;
      if (from < 1) return;

      const prevChar = editor.state.doc.textBetween(from - 1, from, "\n", "\n");
      if (prevChar === "/") {
        editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
      }
    } catch {
      // ignore
    }
  }, []);

  const onEditorKeyDown = useCallback(
    (editor, event) => {
      if (event.nativeEvent?.isComposing || event.keyCode === 229) {
        return false;
      }

      if (event.key === "Escape") {
        if (slashPos) {
          event.preventDefault();
          removeTrailingSlash(editor);
          closeSlashMenu();
          return true;
        }
        return false;
      }

      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
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
        return false;
      }

      return false;
    },
    [slashPos, closeSlashMenu, removeTrailingSlash]
  );

  return { slashPos, setSlashPos, closeSlashMenu, onEditorKeyDown };
}