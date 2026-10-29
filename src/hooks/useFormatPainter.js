import { useEffect, useState } from "react";
import { copyFormatting, pasteFormatting } from "../lib/textFormatting";

// Format painter: copy the formatting at the cursor, then drag over the target text.
// One use per click; Esc cancels.
export function useFormatPainter(editor) {
  const [marks, setMarks] = useState(null);
  const armed = marks !== null;

  useEffect(() => {
    if (!editor || !armed) return undefined;
    const dom = editor.view.dom;
    dom.classList.add("is-painting");
    // ProseMirror reads the DOM selection after mouseup, so wait for that update
    // (or a short timeout when the selection did not change) before painting.
    let timer = 0;
    const paint = () => {
      clearTimeout(timer);
      editor.off("selectionUpdate", paint);
      if (editor.isDestroyed || editor.state.selection.empty) return;
      pasteFormatting(editor, marks);
      setMarks(null);
    };
    const apply = () => {
      editor.off("selectionUpdate", paint);
      editor.on("selectionUpdate", paint);
      clearTimeout(timer);
      timer = setTimeout(paint, 250);
    };
    const escape = (event) => { if (event.key === "Escape") setMarks(null); };
    dom.addEventListener("mouseup", apply);
    dom.addEventListener("touchend", apply);
    document.addEventListener("keydown", escape);
    return () => {
      clearTimeout(timer);
      editor.off("selectionUpdate", paint);
      dom.classList.remove("is-painting");
      dom.removeEventListener("mouseup", apply);
      dom.removeEventListener("touchend", apply);
      document.removeEventListener("keydown", escape);
    };
  }, [editor, armed, marks]);

  const toggle = () => {
    if (armed || !editor) { setMarks(null); return; }
    setMarks(copyFormatting(editor.state));
  };
  return { armed, toggle };
}
