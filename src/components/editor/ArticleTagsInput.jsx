import { useId, useState } from "react";
import { X } from "lucide-react";
import { MAX_TAGS, normalizeTags } from "../../lib/articleTags";

// Enter or comma adds a tag; Backspace on an empty field removes the last one.
export default function ArticleTagsInput({ value = [], onChange, disabled }) {
  const [draft, setDraft] = useState("");
  const hint = useId();
  const full = value.length >= MAX_TAGS;
  const add = (text) => {
    const next = normalizeTags([...value, ...String(text).split(",")]);
    if (next.length !== value.length) onChange(next);
    setDraft("");
  };
  return (
    <div className="uf-tags-input">
      <label>태그
        <input type="text" value={draft} disabled={disabled || full} aria-describedby={hint}
          placeholder={full ? `최대 ${MAX_TAGS}개` : "예: 단체전, 회화"}
          onChange={(event) => {
            const text = event.target.value;
            if (text.includes(",")) add(text); else setDraft(text);
          }}
          onBlur={() => { if (draft.trim()) add(draft); }}
          onKeyDown={(event) => {
            if (event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229) return;
            if (event.key === "Enter") { event.preventDefault(); if (draft.trim()) add(draft); }
            if (event.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }} />
      </label>
      <p id={hint}>홈 검색에서 찾을 수 있어요. Enter나 쉼표로 추가해요. ({value.length}/{MAX_TAGS})</p>
      {value.length > 0 && <ul aria-label="추가한 태그">
        {value.map((tag) => <li key={tag}>#{tag}
          <button type="button" disabled={disabled} aria-label={`${tag} 태그 삭제`} title="삭제"
            onClick={() => onChange(value.filter((item) => item !== tag))}><X size={13} /></button>
        </li>)}
      </ul>}
    </div>
  );
}
