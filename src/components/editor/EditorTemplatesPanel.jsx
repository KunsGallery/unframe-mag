import { useEffect, useRef, useState } from 'react';
import { LayoutTemplate, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { BUILT_IN_TEMPLATES, createEditorTemplates } from '../../lib/editorHistory.js';

/** onApply(template) applies template.snapshot and marks the draft dirty.
 * Supply getSnapshot() for metadata + HTML; otherwise editor.getHTML() is used.
 * Application is local; parent must hold autosave until explicit Save.
 */
export default function EditorTemplatesPanel(props) {
  return <TemplatesPanel key={props.userId || 'anonymous'} {...props} />;
}
function TemplatesPanel({ editor, userId, onApply, onToast, disabled = false, getSnapshot }) {
  const [templates, setTemplates] = useState([...BUILT_IN_TEMPLATES]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!userId) return;
    try {
      const store = createEditorTemplates({ userId });
      setTemplates(store.list());
      setBackup(store.readBackup());
    }
    catch { setError('저장한 템플릿을 불러오지 못했어요. 저장 공간을 확인해 주세요.'); }
  }, [userId]);
  const current = () => {
    if (getSnapshot) return getSnapshot();
    if (!editor || editor.isDestroyed) throw new Error('Editor unavailable');
    return { contentHTML: editor.getHTML() };
  };
  function save(event) {
    event.preventDefault();
    if (disabled || busy || !userId) return;
    try {
      const store = createEditorTemplates({ userId });
      store.save(name.trim(), current());
      setTemplates(store.list()); setName(''); setError(''); onToast?.('템플릿을 저장했어요.');
    } catch (failure) { setError(`템플릿을 저장하지 못했어요. ${failure.message}`); }
  }
  function remove(id) {
    if (disabled || busy) return;
    try {
      const store = createEditorTemplates({ userId });
      store.remove(id); setTemplates(store.list()); setError('');
      if (selected?.id === id) setSelected(null);
    } catch { setError('템플릿을 삭제하지 못했어요. 다시 시도해 주세요.'); }
  }
  async function apply() {
    if (disabled || busy || !selected || !onApply) return;
    setBusy(true); setError('');
    try {
      const { snapshot, backup: preserved } = createEditorTemplates({ userId }).prepareApply(selected, current());
      setBackup(preserved);
      const result = await onApply({ ...selected, snapshot });
      if (alive.current && result !== false) { setSelected(null); onToast?.('템플릿을 적용했어요.'); }
    } catch { if (alive.current) setError('템플릿을 적용하지 못했어요. 저장 공간과 편집기를 확인해 주세요.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function restoreBackup() {
    if (disabled || busy || !backup || !userId || !onApply) return;
    setBusy(true); setError('');
    try {
      const prepared = createEditorTemplates({ userId }).prepareRestoreBackup(current());
      setBackup(prepared.backup);
      const result = await onApply({ id: prepared.restoredFrom, name: '적용 전 내용 복원', snapshot: prepared.snapshot, builtIn: false, isBackup: true });
      if (alive.current && result !== false) { setSelected(null); onToast?.('적용 전 내용을 복원했어요.'); }
    } catch { if (alive.current) setError('적용 전 내용을 복원하지 못했어요. 저장 공간과 편집기를 확인해 주세요.'); }
    finally { if (alive.current) setBusy(false); }
  }
  return <section className="min-w-0 space-y-3 text-sm" aria-label="편집 템플릿" aria-busy={busy}>
    <h2 className="flex items-center gap-2 font-bold"><LayoutTemplate size={16} />편집 템플릿</h2>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    {backup && <button type="button" disabled={disabled || busy || !onApply || !userId} onClick={restoreBackup} className="flex items-center gap-2 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 disabled:opacity-40"><RotateCcw size={16} />적용 전 내용 복원</button>}
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
      {templates.map((template) => <li key={template.id} className="flex items-center gap-2">
        <button type="button" disabled={disabled || busy || !userId} aria-pressed={selected?.id === template.id} onClick={() => setSelected(template)} className="min-w-0 flex-1 p-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"><span className="block break-words font-medium">{template.name}</span><span className="text-xs text-zinc-600 dark:text-zinc-300">{template.builtIn ? '기본 템플릿' : '내 템플릿'}</span></button>
        {!template.builtIn && <button type="button" title="템플릿 삭제" aria-label={`${template.name} 삭제`} disabled={disabled || busy} onClick={() => remove(template.id)} className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"><Trash2 size={16} /></button>}
      </li>)}
    </ul>
    {selected && <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
      <p className="break-words font-medium">{selected.name}</p>
      <p className="whitespace-pre-wrap break-words max-h-32 overflow-auto text-zinc-600 dark:text-zinc-300">{selected.snapshot.contentHTML.replace(/<[^>]*>/g, ' ').slice(0, 600)}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled || busy || !onApply} onClick={apply} className="rounded bg-[#004aad] px-3 py-2 text-white disabled:opacity-40">{busy ? '적용 중...' : '템플릿 적용'}</button><button type="button" disabled={busy} onClick={() => setSelected(null)} className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700">취소</button></div>
    </div>}
    <form onSubmit={save} className="flex min-w-0 items-center gap-2">
      <input aria-label="템플릿 이름" placeholder="템플릿 이름" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={disabled || busy || !userId} className="min-w-0 flex-1 rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
      <button type="submit" title="현재 초안을 템플릿으로 저장" aria-label="현재 초안을 템플릿으로 저장" disabled={disabled || busy || !userId || !name.trim()} className="p-2 rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40"><Plus size={16} /></button>
    </form>
  </section>;
}
