import { useEffect, useState } from "react";

function readNotes(editor) {
  const notes = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "ufFootnote") notes.push(String(node.attrs.note || ""));
  });
  return notes;
}

// Collects footnote markers from the rendered article into a numbered list and
// links each marker and note to the other.
export default function ArticleFootnotes({ editor, root }) {
  const [notes, setNotes] = useState([]);
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
      marker.setAttribute("role", "doc-noteref");
      marker.setAttribute("aria-label", `각주 ${index + 1}`);
    });
    const jump = (event) => {
      const marker = event.target.closest?.("sup[data-uf-footnote]");
      if (!marker || !root.contains(marker) || (event.type === "keydown" && event.key !== "Enter")) return;
      event.preventDefault();
      // The editor preview renders into an iframe, so look up ids in this element's own document.
      root.ownerDocument.getElementById(marker.id.replace("fnref", "fn"))?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    root.addEventListener("click", jump);
    root.addEventListener("keydown", jump);
    return () => { root.removeEventListener("click", jump); root.removeEventListener("keydown", jump); };
  }, [root, notes]);

  if (!notes.length) return null;
  return (
    <section className="uf-footnotes" aria-labelledby="uf-footnotes-title" role="doc-endnotes">
      <h2 id="uf-footnotes-title">주석</h2>
      <ol>
        {notes.map((note, index) => (
          <li key={index} id={`uf-fn-${index + 1}`}>
            <span>{note}</span>
            <a href={`#uf-fnref-${index + 1}`} aria-label={`본문 ${index + 1}번 위치로`} onClick={(event) => {
              event.preventDefault();
              event.currentTarget.ownerDocument.getElementById(`uf-fnref-${index + 1}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}>↩</a>
          </li>
        ))}
      </ol>
    </section>
  );
}
