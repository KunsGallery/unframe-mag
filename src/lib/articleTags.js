// src/lib/articleTags.js
// Keep the limit in sync with the articleSummaries rule in firestore.rules.
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

// Accepts an array or a comma-separated string; drops "#", blanks and case-insensitive duplicates.
export function normalizeTags(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  const seen = new Set();
  const tags = [];
  for (const item of raw) {
    const tag = String(item ?? "").replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}
