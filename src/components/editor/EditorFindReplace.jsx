import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { getSearchState } from "../../tiptap/extensions/SearchReplace";

// Floating find/replace bar; the SearchReplace extension owns matches and highlights.
// Mounted while open (keyed per opening), so it starts from the current selection.
export default function EditorFindReplace({ editor, initialQuery = "", onClose, disabled, onToast }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState(initialQuery);
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [state, setState] = useState({ count: 0, index: -1 });

  useEffect(() => { inputRef.current?.select(); }, []);

  useEffect(() => {
    if (!editor) return undefined;
    const sync = () => {
      const current = getSearchState(editor.state);
      setState({ count: current.matches.length, index: current.index });
    };
    editor.on("transaction", sync);
    return () => editor.off("transaction", sync);
  }, [editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.setSearchQuery(query, { caseSensitive });
  }, [editor, query, caseSensitive]);

  useEffect(() => () => { if (editor && !editor.isDestroyed) editor.commands.clearSearch(); }, [editor]);

  const close = () => { onClose(); editor?.commands.focus(); };
  const replaceAll = () => {
    const count = state.count;
    if (editor.commands.replaceAllSearchMatches(replacement)) onToast?.(`${count}곳을 바꿨어요. 되돌리려면 ⌘Z를 누르세요.`);
  };
  return (
    <section className="uf-find" aria-label="찾기 및 바꾸기" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
      <div className="uf-find__row">
        <input ref={inputRef} autoFocus type="search" aria-label="찾을 내용" placeholder="찾기" value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229) return;
            if (event.key === "Enter") { event.preventDefault(); editor.commands.gotoSearchMatch(event.shiftKey ? -1 : 1); }
          }} />
        <span className="uf-find__count" role="status" aria-live="polite">{query ? (state.count ? `${state.index + 1}/${state.count}` : "없음") : ""}</span>
        <button type="button" aria-label="이전 결과" title="이전 (Shift+Enter)" disabled={!state.count} onClick={() => editor.commands.gotoSearchMatch(-1)}><ChevronUp size={16} /></button>
        <button type="button" aria-label="다음 결과" title="다음 (Enter)" disabled={!state.count} onClick={() => editor.commands.gotoSearchMatch(1)}><ChevronDown size={16} /></button>
        <label className="uf-find__case" title="대소문자 구분"><input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />Aa</label>
        <button type="button" aria-label="찾기 닫기" title="닫기 (Esc)" onClick={close}><X size={16} /></button>
      </div>
      <div className="uf-find__row">
        <input type="text" aria-label="바꿀 내용" placeholder="바꾸기" value={replacement} disabled={disabled}
          onChange={(event) => setReplacement(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229) return;
            if (event.key === "Enter") { event.preventDefault(); editor.commands.replaceSearchMatch(replacement); }
          }} />
        <button type="button" disabled={disabled || !state.count} onClick={() => editor.commands.replaceSearchMatch(replacement)}>바꾸기</button>
        <button type="button" disabled={disabled || !state.count} onClick={replaceAll}>모두 바꾸기</button>
      </div>
    </section>
  );
}
