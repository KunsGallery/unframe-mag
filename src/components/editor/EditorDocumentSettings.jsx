import { Trash2 } from "lucide-react";
import UploadButton from "./UploadButton";
import { ARTICLE_CATEGORIES } from "../../constants/categories";
import RelatedArticlesPicker from "./RelatedArticlesPicker";
import ArticleTagsInput from "./ArticleTagsInput";
import SharePreviewCard from "./SharePreviewCard";

const EXCERPT_LIMIT = 200;

export default function EditorDocumentSettings({
  title,
  subtitle,
  excerpt,
  setExcerpt,
  tags,
  setTags,
  excerptRef,
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
      <label>요약문 (리드 문구)
        <textarea ref={excerptRef} rows={3} maxLength={EXCERPT_LIMIT} value={excerpt} disabled={editingDisabled} aria-describedby="uf-excerpt-hint"
          placeholder="비워 두면 부제목을 사용해요" onChange={(event) => { setExcerpt(event.target.value); setDraftDirty(true); }} />
      </label>
      <p id="uf-excerpt-hint" className="uf-field-hint">글 맨 위에 큰 인용문으로 보이고, 공유·검색 설명으로 쓰여요. ({excerpt.length}/{EXCERPT_LIMIT})</p>
      <ArticleTagsInput value={tags} disabled={editingDisabled} onChange={(next) => { setTags(next); setDraftDirty(true); }} />
      <SharePreviewCard title={title} subtitle={subtitle} excerpt={excerpt} cover={cover} coverMedium={coverMedium} />
      <RelatedArticlesPicker db={db} value={relatedEditionNos} selfEditionNo={selfEditionNo} disabled={editingDisabled}
        onChange={(next) => { setRelatedEditionNos(next); setDraftDirty(true); }} />
    </section>
  );
}
