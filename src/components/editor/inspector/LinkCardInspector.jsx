import { useState } from "react";
import Row from "./InspectorRow";
import UploadButton from "../UploadButton";
import { fetchLinkPreview, linkCardAttrs } from "../../../lib/linkCard";
import { withLinkScheme } from "../../../lib/editorInput";
import { isPublicationLinkValid } from "../../../lib/publicationChecks";

const FIELDS = [
  { key: "title", label: "제목", multiline: false },
  { key: "description", label: "설명", multiline: true },
  { key: "siteName", label: "사이트 이름", multiline: false },
];

const inputClass = (isDarkMode) => [
  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
].join(" ");

// Fields commit on blur/Enter (uncontrolled), so Korean IME composition is never interrupted.
export default function LinkCardInspector({ selected, setAttrs, isDarkMode, onToast, uploading, progress, onPickImage }) {
  const [loading, setLoading] = useState(false);
  const attrs = selected.attrs;
  const commit = (key, value) => { if ((attrs[key] || "") !== value) setAttrs("ufLinkCard", { [key]: value }); };
  const commitOnEnter = (event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } };
  const resetKey = `${selected.pos}:${attrs.url}:${attrs.title}:${attrs.image}`;

  const refresh = async () => {
    setLoading(true);
    try {
      setAttrs("ufLinkCard", linkCardAttrs(attrs.url, await fetchLinkPreview(attrs.url)));
      onToast?.("링크 정보를 다시 불러왔어요.");
    } catch {
      onToast?.("미리보기 정보를 가져오지 못했어요. 직접 입력해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5" key={resetKey}>
      <Row label="주소">
        <input defaultValue={attrs.url} inputMode="url" aria-label="링크 주소" className={inputClass(isDarkMode)} onKeyDown={commitOnEnter}
          onBlur={(event) => {
            const value = withLinkScheme(event.target.value.trim());
            if (!value || !isPublicationLinkValid(value)) { event.target.value = attrs.url; onToast?.("열 수 없는 주소예요."); return; }
            commit("url", value);
          }} />
      </Row>
      <button type="button" disabled={loading || !attrs.url} onClick={refresh}
        className="w-full min-h-10 rounded-xl border border-zinc-300 text-xs font-bold disabled:opacity-50 dark:border-zinc-700">
        {loading ? "불러오는 중…" : "주소에서 정보 다시 불러오기"}
      </button>
      {FIELDS.map(({ key, label, multiline }) => (
        <Row key={key} label={label}>
          {multiline
            ? <textarea defaultValue={attrs[key]} rows={3} aria-label={label} className={inputClass(isDarkMode)} onBlur={(event) => commit(key, event.target.value.trim())} />
            : <input defaultValue={attrs[key]} aria-label={label} className={inputClass(isDarkMode)} onKeyDown={commitOnEnter} onBlur={(event) => commit(key, event.target.value.trim())} />}
        </Row>
      ))}
      <Row label="대표 이미지">
        {attrs.image ? <img src={attrs.image} alt="" className="mb-2 w-full rounded-lg object-cover aspect-[1.91/1]" referrerPolicy="no-referrer" /> : null}
        <input defaultValue={attrs.image} inputMode="url" aria-label="대표 이미지 주소" placeholder="https://" className={inputClass(isDarkMode)} onKeyDown={commitOnEnter}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value && !/^https?:\/\//i.test(value)) { event.target.value = attrs.image; onToast?.("http(s) 이미지 주소를 넣어 주세요."); return; }
            commit("image", value);
          }} />
      </Row>
      <div className="flex gap-2">
        <UploadButton label="이미지 올리기" title="대표 이미지를 직접 올리기" uploading={uploading} progress={progress} onPickFile={onPickImage} />
        {attrs.image ? <button type="button" className="min-h-10 rounded-xl border border-zinc-300 px-3 text-xs font-bold dark:border-zinc-700" onClick={() => setAttrs("ufLinkCard", { image: "" })}>이미지 빼기</button> : null}
      </div>
    </div>
  );
}
