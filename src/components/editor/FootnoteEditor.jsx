import { useEffect, useId, useRef, useState } from "react";
import { FOOTNOTE_EDIT_EVENT, MAX_FOOTNOTE_LENGTH } from "../../tiptap/nodes/UfFootnote";

// Opens when a footnote marker is inserted or clicked in the editor.
export default function FootnoteEditor({ editor }) {
  const dialog = useRef(null);
  const heading = useId();
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const open = (event) => {
      if (!editor?.isEditable) return;
      setTarget({ pos: event.detail.pos, wasEmpty: !event.detail.note });
      setNote(event.detail.note || "");
    };
    window.addEventListener(FOOTNOTE_EDIT_EVENT, open);
    return () => window.removeEventListener(FOOTNOTE_EDIT_EVENT, open);
  }, [editor]);

  useEffect(() => {
    const element = dialog.current;
    if (target && element && !element.open) element.showModal();
  }, [target]);

  if (!target) return null;
  const finish = () => { dialog.current?.close(); setTarget(null); editor?.commands.focus(); };
  const remove = () => {
    const node = editor.state.doc.nodeAt(target.pos);
    if (node?.type.name === "ufFootnote") editor.chain().deleteRange({ from: target.pos, to: target.pos + node.nodeSize }).run();
    finish();
  };
  const save = () => {
    if (!note.trim()) { remove(); return; }
    editor.commands.setFootnoteNote(target.pos, note.trim());
    finish();
  };
  return (
    <dialog ref={dialog} aria-labelledby={heading} className="uf-footnote-dialog"
      onCancel={(event) => { event.preventDefault(); if (target.wasEmpty && !note.trim()) remove(); else finish(); }}>
      <h2 id={heading}>각주</h2>
      <textarea autoFocus rows={4} maxLength={MAX_FOOTNOTE_LENGTH} value={note} placeholder="출처나 덧붙일 설명을 입력하세요"
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); save(); } }} />
      <p>본문에는 번호만 보이고, 내용은 글 끝 ‘주석’에 모여요. 번호는 순서대로 자동으로 매겨져요.</p>
      <footer>
        <button type="button" onClick={remove}>각주 삭제</button>
        <button type="button" onClick={() => (target.wasEmpty && !note.trim() ? remove() : finish())}>취소</button>
        <button type="button" className="uf-primary" onClick={save}>저장</button>
      </footer>
    </dialog>
  );
}
