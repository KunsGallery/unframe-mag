// src/lib/shareMeta.js
// Shared by the editor's share preview and the Netlify article preview tags,
// so what editors see is what link previews show.
export const DEFAULT_SHARE_DESCRIPTION = "UNFRAME 매거진 U#의 전시·예술 기록";
export const SHARE_DESCRIPTION_LIMIT = 200;
// Messenger cards usually show about this many characters before cutting off.
export const SHARE_DESCRIPTION_VISIBLE = 80;

export function shareTitle(article) {
  return `${String(article?.title || "").trim() || "Untitled"} | U#`;
}

// The lead text (excerpt) is written for sharing, so it wins over the subtitle.
export function shareDescription(article) {
  const text = String(article?.excerpt || "").trim() || String(article?.subtitle || "").trim();
  return (text || DEFAULT_SHARE_DESCRIPTION).slice(0, SHARE_DESCRIPTION_LIMIT);
}

export function hasShareDescription(article) {
  return !!(String(article?.excerpt || "").trim() || String(article?.subtitle || "").trim());
}
