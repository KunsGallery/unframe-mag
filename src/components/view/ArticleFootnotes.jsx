import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

function readNotes(editor) {
  const notes = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "ufFootnote") notes.push(String(node.attrs.note || ""));
  });
  return notes;
}

// The editor preview renders into an iframe, so look up ids in this element's own document.
const scrollToId = (from, id) =>
  from.ownerDocument.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

// Collects footnote markers into a numbered list. Tapping a marker opens the note
// in place, so readers do not lose their spot; the list stays for reading all notes.
export default function ArticleFootnotes({ editor, root }) {
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(null);
  const popover = useRef(null);

  useEffect(() => {
    if (!editor) return undefined;
    const sync = () => {
      if (editor.isDestroyed) return;
      const next = readNotes(editor);
      setNotes((prev) => (prev.length === next.length && prev.every((note, index) => note === next[index]) ? prev : next));
    };
    sync();
    editor.on("transaction", sync);
    return () => editor.off("transaction", sync);
  }, [editor]);

  useEffect(() => {
    if (!root || !notes.length) return undefined;
    const markers = [...root.querySelectorAll(".ProseMirror sup[data-uf-footnote]")];
    markers.forEach((marker, index) => {
      marker.id = `uf-fnref-${index + 1}`;
      marker.tabIndex = 0;
      marker.setAttribute("role", "button");
      marker.setAttribute("aria-label", `각주 ${index + 1} 보기`);
      marker.removeAttribute("title");
    });
    const show = (event) => {
      const marker = event.target.closest?.("sup[data-uf-footnote]");
      if (!marker || !root.contains(marker)) return;
      if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const index = markers.indexOf(marker);
      if (index < 0) return;
      const box = marker.getBoundingClientRect();
      const frame = root.getBoundingClientRect();
      setOpen((current) => (current?.index === index ? null : {
        index, byKeyboard: event.type === "keydown",
        top: box.bottom - frame.top + 8,
        left: Math.min(Math.max(box.left - frame.left - 24, 0), Math.max(frame.width - 320, 0)),
      }));
    };
    root.addEventListener("click", show);
    root.addEventListener("keydown", show);
    return () => { root.removeEventListener("click", show); root.removeEventListener("keydown", show); };
  }, [root, notes]);

  useEffect(() => {
    if (!open || !root) return undefined;
    if (open.byKeyboard) popover.current?.querySelector("button")?.focus();
    const doc = root.ownerDocument;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && (popover.current?.contains(event.target) || event.target.closest?.("sup[data-uf-footnote]"))) return;
      if (event.type === "keydown") doc.getElementById(`uf-fnref-${open.index + 1}`)?.focus();
      setOpen(null);
    };
    doc.addEventListener("pointerdown", close);
    doc.addEventListener("keydown", close);
    return () => { doc.removeEventListener("pointerdown", close); doc.removeEventListener("keydown", close); };
  }, [open, root]);

  if (!notes.length) return null;
  return (
    <>
      {open && notes[open.index] !== undefined && (
        <div ref={popover} className="uf-footnote-pop" role="dialog" aria-label={`각주 ${open.index + 1}`} style={{ top: open.top, left: open.left }}>
          <p><strong>{open.index + 1}</strong>{notes[open.index]}</p>
          <div>
            <a href={`#uf-fn-${open.index + 1}`} onClick={(event) => { event.preventDefault(); setOpen(null); scrollToId(event.currentTarget, `uf-fn-${open.index + 1}`); }}>주석 목록에서 보기</a>
            <button type="button" aria-label="각주 닫기" onClick={(event) => { const doc = event.currentTarget.ownerDocument; setOpen(null); doc.getElementById(`uf-fnref-${open.index + 1}`)?.focus(); }}><X size={14} /></button>
          </div>
        </div>
      )}
      <section className="uf-footnotes" aria-labelledby="uf-footnotes-title" role="doc-endnotes">
        <h2 id="uf-footnotes-title">주석</h2>
        <ol>
          {notes.map((note, index) => (
            <li key={index} id={`uf-fn-${index + 1}`}>
              <span>{note}</span>
              <a href={`#uf-fnref-${index + 1}`} aria-label={`본문 ${index + 1}번 위치로`} onClick={(event) => {
                event.preventDefault();
                scrollToId(event.currentTarget, `uf-fnref-${index + 1}`);
              }}>↩</a>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
