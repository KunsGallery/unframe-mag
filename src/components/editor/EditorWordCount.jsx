import { useEffect, useState } from "react";
import { estimateReadMinutes } from "../../lib/readingMeta";

const format = (value) => value.toLocaleString("ko-KR");

function countText(text) {
  const value = String(text || "");
  return { withSpaces: value.replace(/\n/g, "").length, withoutSpaces: value.replace(/\s/g, "").length };
}

// Counts body text only (not title or captions) and reuses the reader-facing read-time estimate.
export default function EditorWordCount({ editor }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!editor) return undefined;
    let timer;
    const measure = () => {
      if (editor.isDestroyed) return;
      const { doc, selection } = editor.state;
      const text = doc.textBetween(0, doc.content.size, "\n", " ");
      const selected = selection.empty ? "" : doc.textBetween(selection.from, selection.to, "\n", " ");
      setStats({
        ...countText(text),
        minutes: estimateReadMinutes({ contentHTML: text }, { min: 1 }),
        selected: selected ? countText(selected).withSpaces : 0,
      });
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(measure, 250); };
    measure();
    editor.on("update", schedule);
    editor.on("selectionUpdate", schedule);
    return () => { clearTimeout(timer); editor.off("update", schedule); editor.off("selectionUpdate", schedule); };
  }, [editor]);
  if (!stats) return null;
  return (
    <span className="uf-word-count" title={`공백 제외 ${format(stats.withoutSpaces)}자`}>
      {stats.selected ? `선택 ${format(stats.selected)}자 · ` : ""}{format(stats.withSpaces)}자 · 약 {stats.minutes}분
    </span>
  );
}
