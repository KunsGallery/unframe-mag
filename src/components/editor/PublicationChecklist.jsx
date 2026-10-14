import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CircleAlert, Check, ArrowRight, X, Send } from 'lucide-react';
import { publicationChecks } from '../../lib/publicationChecks';

// onFocusIssue(issue) runs after the modal closes so the editor can receive focus.
export default function PublicationChecklist({ editor, meta = {}, onClose, onFocusIssue, onPublish, isSaving = false }) {
  const dialog = useRef(null);
  const heading = useId();
  const [pending, setPending] = useState(false);
  const publishLock = useRef(false);
  const [failure, setFailure] = useState('');
  const [, setRevision] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => setRevision((value) => value + 1);
    editor.on('update', update);
    return () => editor.off('update', update);
  }, [editor]);
  const result = publicationChecks({ ...meta, content: editor?.getJSON() });
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { if (element.open) element.close(); document.body.style.overflow = overflow; };
  }, []);
  async function publish() {
    const latest = publicationChecks({ ...meta, contentJSON: editor?.getJSON(), content: editor?.getJSON() });
    if (!latest.canPublish || publishLock.current || isSaving || !onPublish) return;
    publishLock.current = true;
    setPending(true);
    setFailure('');
    try { if (await onPublish(latest) === false) setFailure('발행하지 못했어요. 다시 시도해 주세요.'); }
    catch { setFailure('발행하지 못했어요. 다시 시도해 주세요.'); }
    finally { publishLock.current = false; setPending(false); }
  }
  return <dialog ref={dialog} aria-labelledby={heading} onCancel={(event) => { event.preventDefault(); onClose?.(); }}
    className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[85vh] overflow-auto rounded-lg bg-[var(--uf-bg)] text-[var(--uf-text)] p-6 backdrop:bg-black/50">
    <React.Fragment key="checklist">
      <header className="flex items-center justify-between gap-4"><h2 id={heading} className="text-xl font-bold">발행 전 확인</h2>
        <button type="button" autoFocus aria-label="발행 점검 닫기" title="닫기" onClick={onClose} className="p-3"><X aria-hidden="true" size={20} /></button></header>
      <p role="status" className="my-4">오류 {result.errors.length}개 · 권장 사항 {result.warnings.length}개</p>
      {result.issues.length ? <ul className="divide-y divide-zinc-300">
        {result.issues.map((issue) => <li key={issue.id} className="flex items-center gap-3 py-4">
          {issue.severity === 'error' ? <CircleAlert aria-label="오류" className="shrink-0 text-red-600" /> : <AlertTriangle aria-label="권장 사항" className="shrink-0 text-amber-600" />}
          <span className="flex-1">{issue.message}{issue.position !== null && <small className="block">본문 위치 {issue.position}{issue.imageIndex !== undefined ? ` · 이미지 ${issue.imageIndex + 1}` : ''}</small>}</span>
          {onFocusIssue && <button type="button" aria-label={`${issue.message} 해당 위치로 이동`} title="해당 위치로 이동" className="p-3" onClick={() => {
            dialog.current.close(); onClose?.(); requestAnimationFrame(() => onFocusIssue(issue));
          }}><ArrowRight aria-hidden="true" size={20} /></button>}
        </li>)}
      </ul> : <p className="flex gap-2 py-4"><Check aria-hidden="true" />발행할 준비가 되었어요.</p>}
      {failure && <p role="alert" className="py-3 text-red-600">{failure}</p>}
      <footer className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="min-h-11 px-4">돌아가기</button>
        <button type="button" disabled={!result.canPublish || pending || isSaving || !onPublish} onClick={publish} className="flex min-h-11 items-center gap-2 rounded bg-[#004aad] px-4 text-white disabled:opacity-50"><Send aria-hidden="true" size={18} />{pending || isSaving ? '발행 중…' : '발행하기'}</button>
      </footer>
    </React.Fragment>
  </dialog>;
}
