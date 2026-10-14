import { useCallback, useEffect, useRef, useState } from 'react';

export function useEditorConfirmation() {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const dialog = useRef(null);
  const confirm = useCallback((message) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setRequest(message);
  }), []);
  const finish = useCallback((accepted) => {
    dialog.current?.close();
    resolver.current?.(accepted);
    resolver.current = null;
    setRequest(null);
  }, []);
  useEffect(() => {
    if (!request) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, [request]);
  useEffect(() => () => { resolver.current?.(false); }, []);
  const confirmation = <dialog ref={dialog} aria-labelledby="uf-confirm-title" onCancel={(event) => { event.preventDefault(); finish(false); }} className="m-auto w-[calc(100%_-_32px)] max-w-md rounded-lg bg-[var(--uf-bg)] p-6 text-[var(--uf-text)] backdrop:bg-black/50">
    <h2 id="uf-confirm-title" className="text-lg font-bold">변경사항 확인</h2>
    <p className="mt-4 text-sm leading-relaxed">{request}</p>
    <div className="mt-6 flex justify-end gap-3"><button type="button" autoFocus onClick={() => finish(false)} className="min-h-11 rounded border border-zinc-300 px-4">취소</button><button type="button" onClick={() => finish(true)} className="min-h-11 rounded bg-[#004aad] px-4 text-white">확인</button></div>
  </dialog>;
  return { confirm, confirmation };
}
