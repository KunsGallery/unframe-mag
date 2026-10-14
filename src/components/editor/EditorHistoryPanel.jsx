import { useEffect, useRef, useState } from 'react';
import { History, RefreshCw, RotateCcw } from 'lucide-react';
import { createEditorHistory } from '../../lib/editorHistory.js';

/** onRestore(snapshot, record) must preserve current edits and mark dirty.
 * Optional getSnapshot enables the built-in local before-restore safeguard.
 * sourceArticleId reads published-source history while editing a revision draft.
 */
export default function EditorHistoryPanel(props) {
  return <HistoryPanel key={`${props.userId}:${props.articleId}:${props.sourceArticleId || ''}`} {...props} />;
}
function HistoryPanel({ db, articleId, sourceArticleId, userId, onRestore, disabled = false, refreshKey, getSnapshot }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('firestore');
  const [selected, setSelected] = useState(null);
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    setSelected(null);
    if (!userId || !(sourceArticleId || articleId)) { setItems([]); return; }
    setLoading(true);
    setError('');
    const ids = [...new Set([articleId, sourceArticleId].filter(Boolean))];
    Promise.all(ids.map((id) => createEditorHistory({ db, userId, articleId: id }).list().then((result) => ({ ...result, articleId: id })))).then((results) => {
      if (cancelled) return;
      setItems(results.flatMap((result) => result.items.map((item) => ({ ...item, articleId: result.articleId }))).sort((a, b) => b.savedAt - a.savedAt));
      setSource(results.some((result) => result.source === 'local') ? 'local' : 'firestore');
      if (results.some((result) => result.error)) setError('일부 기록을 불러오지 못했어요. 가능한 기록을 표시합니다.');
    }).catch(() => {
      if (!cancelled) { setItems([]); setError('기록을 불러오지 못했어요. 다시 시도해 주세요.'); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [db, articleId, sourceArticleId, userId, refreshKey, reload]);
  async function restore() {
    if (!selected || disabled || busy || !onRestore) return;
    setBusy(true);
    setError('');
    try {
      let snapshot = selected.snapshot;
      if (getSnapshot) snapshot = createEditorHistory({ userId, articleId: articleId || sourceArticleId }).prepareRestore(selected, getSnapshot()).snapshot;
      const result = await onRestore({ ...snapshot }, selected);
      if (alive.current) {
        if (result !== false) setSelected(null);
      }
    } catch { if (alive.current) setError('복원하지 못했어요. 현재 내용을 유지했습니다. 다시 시도해 주세요.'); }
    finally {
      if (alive.current) { setBusy(false); setReload((value) => value + 1); }
    }
  }
  return <section className="min-w-0 space-y-3 text-sm" aria-label="수정 기록" aria-busy={loading || busy}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-bold"><History size={16} />수정 기록</h2>
      <button type="button" title="기록 새로고침" aria-label="기록 새로고침" disabled={loading || busy} onClick={() => setReload((value) => value + 1)} className="p-2 rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-40"><RefreshCw size={16} /></button>
    </div>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    {source === 'local' && items.length > 0 && <p className="text-zinc-600 dark:text-zinc-300">이 기기에 저장된 기록</p>}
    {loading ? <p role="status">기록을 불러오는 중...</p> : items.length === 0 ? <p className="text-zinc-600 dark:text-zinc-300">저장된 수정 기록이 없습니다.</p> : <ul className="max-h-72 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-700">
      {items.map((item) => <li key={`${item.articleId}:${item.id}`}><button type="button" disabled={disabled || busy} aria-pressed={selected?.id === item.id && selected?.articleId === item.articleId} onClick={() => setSelected(item)} className="w-full p-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40">
        <span className="block break-words font-medium">{item.snapshot.title || '제목 없는 초안'}</span>
        <time className="block text-xs text-zinc-600 dark:text-zinc-300" dateTime={new Date(item.savedAt).toISOString()}>{new Date(item.savedAt).toLocaleString('ko-KR')}</time>
        <span className="block text-xs break-words">{item.label}</span>
        {item.localOnly && <span className="block text-xs text-zinc-600 dark:text-zinc-300">이 기기에만 저장됨</span>}
      </button></li>)}
    </ul>}
    {selected && <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
      <p className="break-words">{selected.snapshot.subtitle || selected.snapshot.category}</p>
      <p className="whitespace-pre-wrap break-words max-h-32 overflow-auto text-zinc-600 dark:text-zinc-300">{selected.snapshot.contentHTML.replace(/<[^>]*>/g, ' ').slice(0, 600)}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy || !onRestore} onClick={restore} className="flex items-center gap-2 rounded bg-[#004aad] px-3 py-2 text-white disabled:opacity-40"><RotateCcw size={16} />{busy ? '복원 중...' : '이 버전 복원'}</button>
        <button type="button" disabled={busy} onClick={() => setSelected(null)} className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700">취소</button>
      </div>
    </div>}
  </section>;
}
