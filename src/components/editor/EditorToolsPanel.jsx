import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function EditorToolsPanel({ desktop, open, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else if (dialog.open) dialog.close();
  }, [open, desktop]);
  useEffect(() => {
    if (desktop || !open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [desktop, open]);
  if (desktop) return <aside className="uf-workspace-panel" aria-label="편집 작업 패널">{children}</aside>;
  return <dialog ref={ref} className="uf-workspace-drawer" aria-label="편집 작업 패널" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="uf-drawer-heading"><strong>편집 도구</strong><button type="button" onClick={onClose} title="닫기" aria-label="편집 도구 닫기"><X size={20} /></button></div>
    {children}
  </dialog>;
}
