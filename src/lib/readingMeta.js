// src/lib/readingMeta.js

export function stripHtml(html = "") {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function estimateReadMinutes(article, { min = 1 } = {}) {
  // Summary documents carry a precomputed value instead of the body.
  if (!article?.contentHTML && Number.isFinite(article?.readMinutes)) {
    return Math.max(min, article.readMinutes);
  }

  const text = stripHtml(
    article?.contentHTML ||
      article?.excerpt ||
      `${article?.title || ""} ${article?.subtitle || ""}`
  );

  if (!text) return 1;

  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const englishWords = text
    .replace(/[가-힣]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.ceil(koreanChars / 500 + englishWords / 200);
  return Math.max(min, minutes);
}

export function timeEmoji(min) {
  if (min <= 2) return "🚀";
  if (min <= 5) return "☕️";
  if (min <= 9) return "📖";
  if (min <= 15) return "🛋️";
  return "🧠";
}
