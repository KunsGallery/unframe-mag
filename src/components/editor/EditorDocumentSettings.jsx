import { Trash2 } from "lucide-react";
import UploadButton from "./UploadButton";
import { ARTICLE_CATEGORIES } from "../../constants/categories";
import RelatedArticlesPicker from "./RelatedArticlesPicker";

export default function EditorDocumentSettings({
  category,
  setCategory,
  cover,
  setCover,
  coverMedium,
  setCoverMedium,
  editingDisabled,
  setDraftDirty,
  uploadCover,
  coverUploading,
  coverProgress,
  toast,
  db,
  relatedEditionNos,
  setRelatedEditionNos,
  selfEditionNo,
}) {
  return (
    <section className="uf-document-settings">
      <h2>글 설정</h2>
      <label>카테고리<select value={category} disabled={editingDisabled} onChange={(event) => { setCategory(event.target.value); setDraftDirty(true); }}>{ARTICLE_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
      <label>대표 이미지{(coverMedium || cover) && <img src={coverMedium || cover} alt="대표 이미지" />}</label>
      <UploadButton label="대표 이미지 업로드" title="대표 이미지 업로드" uploading={coverUploading} progress={coverProgress} disabled={editingDisabled} onPickFile={async (file) => {
        try { const result = await uploadCover(file, { variant: "cover" }); setCover(result.url); setCoverMedium(result.coverMedium || result.url); setDraftDirty(true); }
        catch (error) { toast(error?.userMessage || "대표 이미지 업로드에 실패했어요."); }
      }} />
      <label>대표 이미지 주소<input type="url" value={cover} disabled={editingDisabled} onChange={(event) => { setCover(event.target.value); setDraftDirty(true); }} /></label>
      <details><summary>이미지 고급 설정</summary><label>목록용 이미지 주소<input type="url" value={coverMedium} disabled={editingDisabled} onChange={(event) => { setCoverMedium(event.target.value); setDraftDirty(true); }} /></label></details>
      {cover && <button type="button" disabled={editingDisabled || coverUploading} onClick={() => { setCover(""); setCoverMedium(""); setDraftDirty(true); }}><Trash2 size={16} />대표 이미지 삭제</button>}
      <RelatedArticlesPicker db={db} value={relatedEditionNos} selfEditionNo={selfEditionNo} disabled={editingDisabled}
        onChange={(next) => { setRelatedEditionNos(next); setDraftDirty(true); }} />
    </section>
  );
}
