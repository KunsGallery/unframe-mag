import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";

const MIN_LENGTH = 6;

// Floating "카드로 공유" button under a text selection inside the article body.
// Sits below the selection so it does not collide with the native mobile selection menu.
export default function SelectionShareButton({ root, onShare }) {
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (!root) return undefined;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = window.getSelection();
        const text = current && !current.isCollapsed ? current.toString().trim() : "";
        const range = text.length >= MIN_LENGTH && current.rangeCount ? current.getRangeAt(0) : null;
        if (!range || !root.contains(range.commonAncestorContainer)) { setSelection(null); return; }
        const rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) { setSelection(null); return; }
        if (rect.bottom < 0 || rect.top > window.innerHeight) { setSelection(null); return; }
        const x = Math.min(window.innerWidth - 80, Math.max(80, rect.left + rect.width / 2));
        setSelection({ text, x, y: Math.max(8, Math.min(window.innerHeight - 56, rect.bottom + 12)) });
      });
    };
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [root]);

  if (!selection) return null;
  return (
    <button type="button" className="uf-selection-share" style={{ left: selection.x, top: selection.y }}
      // Keep the selection alive while pressing.
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => { onShare(selection.text); window.getSelection()?.removeAllRanges(); }}>
      <Share2 size={14} aria-hidden="true" /> 카드로 공유
    </button>
  );
}
