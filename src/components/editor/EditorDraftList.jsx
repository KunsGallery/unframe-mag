import { Plus } from "lucide-react";
import { DEFAULT_ARTICLE_CATEGORY } from "../../constants/categories";

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
  return (
    <section className="uf-draft-list"><div className="uf-panel-heading"><h2>내 초안</h2><button type="button" disabled={editingDisabled} onClick={handleStartNewDraft}><Plus size={16} />새 글</button></div>
      {!draftsApi.drafts.length && <p className="uf-empty">저장한 초안이 없어요.</p>}
      {draftsApi.drafts.map((draft) => <button type="button" key={draft.id} disabled={editingDisabled} aria-current={draftId === draft.id ? "true" : undefined} onClick={async () => {
        if (isDirty && !await confirmEditor("저장하지 않은 변경사항을 버리고 다른 초안을 열까요?")) return;
        const success = await loadDraft(draft.id, setters);
        if (success) { loadedDraftRef.current = draft.id; if (!isDesktopEditor) setPanelOpen(false); }
      }}><strong>{draft.title || "제목 없는 초안"}</strong><span>{draft.category || DEFAULT_ARTICLE_CATEGORY}</span></button>)}
    </section>
  );
}
