import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import { Bold, Eraser, Italic, Link2, Strikethrough, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Underline } from "lucide-react";
import { useTextFormatState } from "../../hooks/useTextFormatState";
import { clearFormatting } from "../../lib/textFormatting";
import { editLink } from "../../lib/editorPrompts";
import { FormatButton, HighlightPopover, TextColorPopover, TextPresetPopover, TextSizeSelect } from "./TextFormatControls";

const BUBBLE_GAP = 10;
const EDGE = 8;
// Sticky header + editor action bar + toolbar sit above the writing surface.
const TOP_CHROME = 150;
const coarsePointer = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

function selectionAnchor(editor) {
  const { state, view } = editor;
  const { selection } = state;
  // Node selections (images) and table cell selections have their own tools.
  if (selection.empty || selection instanceof NodeSelection || "$anchorCell" in selection) return null;
  if (selection.$from.parent.type.spec.code) return null;
  if (!state.doc.textBetween(selection.from, selection.to, " ").trim()) return null;
  const start = view.coordsAtPos(selection.from);
  const end = view.coordsAtPos(selection.to, -1);
  return { left: Math.min(start.left, end.left), right: Math.max(start.right, end.right), top: Math.min(start.top, end.top), bottom: Math.max(start.bottom, end.bottom) };
}

// Floating format bar over a text selection. Hidden while the mouse is still dragging.
export default function SelectionFormatBubble({ editor, disabled }) {
  const bubble = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const format = useTextFormatState(editor);

  useEffect(() => {
    if (!editor) return undefined;
    let dragging = false;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (editor.isDestroyed || dragging) return;
        const inBubble = bubble.current?.contains(document.activeElement);
        if (!editor.view.hasFocus() && !inBubble) { setAnchor(null); return; }
        setAnchor(selectionAnchor(editor));
      });
    };
    const down = (event) => { if (event.button === 0) { dragging = true; setAnchor(null); } };
    const up = () => { if (dragging) { dragging = false; update(); } };
    const blur = ({ event }) => { if (!bubble.current?.contains(event?.relatedTarget)) update(); };
    const dom = editor.view.dom;
    dom.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    editor.on("selectionUpdate", update);
    editor.on("focus", update);
    editor.on("blur", blur);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      dom.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      editor.off("selectionUpdate", update);
      editor.off("focus", update);
      editor.off("blur", blur);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor]);

  // Place after render so the bar's own size is known. Touch: below the selection,
  // because iOS/Android draw their native copy menu above it.
  useLayoutEffect(() => {
    const element = bubble.current;
    if (!anchor || !element) return;
    const { width, height } = element.getBoundingClientRect();
    const centre = (anchor.left + anchor.right) / 2;
    const left = Math.max(EDGE, Math.min(window.innerWidth - width - EDGE, centre - width / 2));
    const above = anchor.top - height - BUBBLE_GAP;
    const below = anchor.bottom + BUBBLE_GAP;
    const top = coarsePointer() || above < TOP_CHROME ? Math.min(below, window.innerHeight - height - EDGE) : above;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }, [anchor, format]);

  useEffect(() => {
    if (!anchor) return undefined;
    const escape = (event) => { if (event.key === "Escape" && bubble.current) { setAnchor(null); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [anchor]);

  if (!editor || !anchor || disabled) return null;
  const chain = () => editor.chain().focus();
  return (
    <div ref={bubble} className="uf-format-bubble" role="toolbar" aria-label="선택한 글자 서식"
      style={{ left: -9999, top: -9999 }}>
      <FormatButton label="굵게" shortcut="⌘B" active={format.bold} onClick={() => chain().toggleBold().run()}><Bold size={15} /></FormatButton>
      <FormatButton label="기울임" shortcut="⌘I" active={format.italic} onClick={() => chain().toggleItalic().run()}><Italic size={15} /></FormatButton>
      <FormatButton label="밑줄" shortcut="⌘U" active={format.underline} onClick={() => chain().toggleUnderline().run()}><Underline size={15} /></FormatButton>
      <FormatButton label="취소선" active={format.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough size={15} /></FormatButton>
      <span className="uf-fmt-sep" aria-hidden="true" />
      <TextSizeSelect editor={editor} fontSize={format.fontSize} />
      <TextColorPopover editor={editor} color={format.color} />
      <HighlightPopover editor={editor} highlight={format.highlight} />
      <span className="uf-fmt-sep" aria-hidden="true" />
      <TextPresetPopover editor={editor} />
      <FormatButton label="링크" shortcut="⌘K" active={format.link} onClick={() => editLink(editor)}><Link2 size={15} /></FormatButton>
      <FormatButton label="위 첨자" className="uf-fmt-optional" active={format.superscript} onClick={() => chain().toggleSuperscript().run()}><SuperscriptIcon size={15} /></FormatButton>
      <FormatButton label="아래 첨자" className="uf-fmt-optional" active={format.subscript} onClick={() => chain().toggleSubscript().run()}><SubscriptIcon size={15} /></FormatButton>
      <FormatButton label="서식 지우기" disabled={!format.cleanable} onClick={() => clearFormatting(chain(), editor.schema).run()}><Eraser size={15} /></FormatButton>
    </div>
  );
}
