import { getOptimizedImageUrl } from "../../lib/imageUrl";
import { SHARE_DESCRIPTION_VISIBLE, hasShareDescription, shareDescription, shareTitle } from "../../lib/shareMeta";

// Mirrors the tags netlify/lib/publishedArticles.js writes for link previews.
export default function SharePreviewCard({ title, subtitle, excerpt, cover, coverMedium }) {
  const article = { title, subtitle, excerpt };
  const description = shareDescription(article);
  const image = coverMedium || cover;
  const notes = [];
  if (!image) notes.push("대표 이미지가 없으면 로고가 대신 보여요.");
  if (!hasShareDescription(article)) notes.push("부제목이나 요약문이 없어서 기본 문구가 보여요.");
  else if (description.length > SHARE_DESCRIPTION_VISIBLE) notes.push(`메신저에서는 앞 ${SHARE_DESCRIPTION_VISIBLE}자 정도만 보일 수 있어요.`);
  return (
    <section className="uf-share-preview" aria-label="공유 미리보기">
      <h3>공유 미리보기</h3>
      <figure>
        {image ? <img src={getOptimizedImageUrl(image, { width: 600 })} alt="" /> : <div className="uf-share-preview__logo">U#</div>}
        <figcaption>
          <strong>{shareTitle(article)}</strong>
          <span>{description}</span>
          <small>magazine.unframe.kr</small>
        </figcaption>
      </figure>
      {notes.map((note) => <p key={note}>{note}</p>)}
    </section>
  );
}
