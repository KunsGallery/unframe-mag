import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Search } from 'lucide-react';
import { buildOutline, focusEditorBlock, moveEditorBlock } from '../../lib/editorOutline';

export default function EditorOutline({ editor, disabled = false, onNavigate }) {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    if (!editor) return;
    let timer;
    const sync = () => { setItems(buildOutline(editor.state.doc)); setActive(editor.state.selection.from); };
    const onUpdate = () => { clearTimeout(timer); timer = setTimeout(sync, 180); };
    const onSelection = () => setActive(editor.state.selection.from);
    sync();
    editor.on('update', onUpdate);
    editor.on('selectionUpdate', onSelection);
    return () => { clearTimeout(timer); editor.off('update', onUpdate); editor.off('selectionUpdate', onSelection); };
  }, [editor]);
  return <section aria-label="본문 목차" className="uf-outline">
    <label className="uf-search"><Search size={16} /><input aria-label="본문 블록 검색" placeholder="본문 검색" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
    {!items.length && <p className="uf-empty">본문이 비어 있어요.</p>}
    <ol>{items.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase())).map((item) => <li key={item.pos} className={active >= item.pos && active < item.pos + item.size ? 'is-current' : ''}>
      <button type="button" disabled={disabled} onClick={() => onNavigate ? onNavigate(item.pos) : focusEditorBlock(editor, item.pos)} className={item.heading ? 'uf-outline-heading' : ''} title={item.label}><span>{item.index + 1}</span>{item.label}</button>
      <button type="button" title="블록 위로 이동" aria-label={`${item.label} 위로 이동`} disabled={disabled || item.index === 0} onClick={() => moveEditorBlock(editor, item.pos, -1)}><ArrowUp size={15} /></button>
      <button type="button" title="블록 아래로 이동" aria-label={`${item.label} 아래로 이동`} disabled={disabled || item.index === items.length - 1} onClick={() => moveEditorBlock(editor, item.pos, 1)}><ArrowDown size={15} /></button>
    </li>)}</ol>
    {items.length > 0 && !items.some((item) => item.label.toLowerCase().includes(filter.toLowerCase())) && <p className="uf-empty">검색 결과가 없어요.</p>}
  </section>;
}
