import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_CATEGORY } from "../../constants/categories";
import { matchesSearchTerm, normalizeSearchText } from "../../lib/koreanSearch";
import { formatRelativeTime, toMillis } from "../../lib/relativeTime";
import { useNow } from "../../hooks/useNow";

const SORTS = {
  updated: { label: "최근 수정순", compare: (a, b) => (toMillis(b.updatedAt) ?? 0) - (toMillis(a.updatedAt) ?? 0) },
  created: { label: "만든 순", compare: (a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0) },
  title: { label: "제목순", compare: (a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ko") },
};
const categoryLabel = (key) => ARTICLE_CATEGORIES.find((item) => item.key === key)?.label || key || DEFAULT_ARTICLE_CATEGORY;

export default function EditorDraftList({
  draftsApi,
  draftId,
  editingDisabled,
  handleStartNewDraft,
  isDirty,
  confirmEditor,
  loadDraft,
  setters,
  loadedDraftRef,
  isDesktopEditor,
  setPanelOpen,
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const drafts = useMemo(() => {
    const terms = normalizeSearchText(search).split(/\s+/).filter(Boolean);
    const matches = (draft) => {
      const text = [draft.title, draft.subtitle, draft.excerpt, categoryLabel(draft.category), ...(Array.isArray(draft.tags) ? draft.tags : [])].join(" ");
      return terms.every((term) => matchesSearchTerm(text, term));
    };
    return draftsApi.drafts.filter(matches).sort(SORTS[sort].compare);
  }, [draftsApi.drafts, search, sort]);
  const now = useNow();

  return (
    <section className="uf-draft-list"><div className="uf-panel-heading"><h2>내 초안</h2><button type="button" disabled={editingDisabled} onClick={handleStartNewDraft}><Plus size={16} />새 글</button></div>
      {draftsApi.drafts.length > 0 && <div className="uf-draft-tools">
        <input type="search" aria-label="초안 검색" placeholder="제목·태그·카테고리 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="초안 정렬" value={sort} onChange={(event) => setSort(event.target.value)}>
          {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>}
      {!draftsApi.drafts.length && <p className="uf-empty">저장한 초안이 없어요.</p>}
      {draftsApi.drafts.length > 0 && !drafts.length && <p className="uf-empty">“{search}”에 맞는 초안이 없어요.</p>}
      {drafts.map((draft) => <button type="button" key={draft.id} disabled={editingDisabled} aria-current={draftId === draft.id ? "true" : undefined} onClick={async () => {
        if (isDirty && !await confirmEditor("저장하지 않은 변경사항을 버리고 다른 초안을 열까요?")) return;
        const success = await loadDraft(draft.id, setters);
        if (success) { loadedDraftRef.current = draft.id; if (!isDesktopEditor) setPanelOpen(false); }
      }}>
        <strong>{draft.editMode === "revision" && <em className="uf-draft-badge">수정본</em>}{draft.title || "제목 없는 초안"}</strong>
        <span>{categoryLabel(draft.category)}{draft.updatedAt ? ` · ${formatRelativeTime(draft.updatedAt, now)} 수정` : ""}</span>
      </button>)}
    </section>
  );
}
