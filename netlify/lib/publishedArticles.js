// Shared by the article preview edge function and the sitemap function.
// Published articles are publicly readable, so these anonymous REST reads
// pass the same Firestore rules as a signed-out reader.
import { getOptimizedImageUrl } from "../../src/lib/imageUrl.js";

const PROJECT = "uarchive-8e437";
const RUN_QUERY = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
export const SITE_URL = "https://magazine.unframe.kr";
export const SITE_NAME = "UNFRAME | U#";

const equals = (fieldPath, stringValue) => ({
  fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue } },
});

function plain(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      value.stringValue ?? value.timestampValue ?? value.integerValue ?? null,
    ]),
  );
}

async function runQuery(structuredQuery, timeoutMs) {
  const response = await fetch(RUN_QUERY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Firestore ${response.status}`);
  const rows = await response.json();
  return rows.filter((row) => row.document).map((row) => plain(row.document.fields));
}

export async function findPublishedArticle(editionNo, { timeoutMs = 2500 } = {}) {
  const [article] = await runQuery({
    from: [{ collectionId: "articles" }],
    // Only the preview fields; never download the article body here.
    select: { fields: ["editionNo", "title", "subtitle", "excerpt", "author", "cover", "coverMedium", "category", "createdAt", "updatedAt"].map((fieldPath) => ({ fieldPath })) },
    where: { compositeFilter: { op: "AND", filters: [equals("editionNo", editionNo), equals("status", "published")] } },
    limit: 1,
  }, timeoutMs);
  return article || null;
}

export async function listPublishedArticles({ timeoutMs = 8000 } = {}) {
  return runQuery({
    from: [{ collectionId: "articles" }],
    select: { fields: [{ fieldPath: "editionNo" }, { fieldPath: "updatedAt" }] },
    where: equals("status", "published"),
    limit: 1000,
  }, timeoutMs);
}

export async function listRecentArticles({ count = 30, timeoutMs = 8000 } = {}) {
  return runQuery({
    from: [{ collectionId: "articles" }],
    select: { fields: ["editionNo", "title", "subtitle", "excerpt", "author", "category", "createdAt", "updatedAt"].map((fieldPath) => ({ fieldPath })) },
    where: equals("status", "published"),
    orderBy: [{ field: { fieldPath: "sortIndex" }, direction: "DESCENDING" }],
    limit: count,
  }, timeoutMs);
}

export function articleUrl(editionNo) {
  return `${SITE_URL}/article/${encodeURIComponent(editionNo)}`;
}

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const describe = (article) =>
  String(article.subtitle || article.excerpt || "UNFRAME 매거진 U#의 전시·예술 기록").slice(0, 200);

// schema.org Article data for search results; "<" is escaped so the JSON cannot close the script tag.
export function articleJsonLd(article, image) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: String(article.title || "Untitled").slice(0, 110),
    description: describe(article),
    image: [image],
    url: articleUrl(article.editionNo),
    mainEntityOfPage: articleUrl(article.editionNo),
    ...(article.createdAt ? { datePublished: article.createdAt } : {}),
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    ...(article.category ? { articleSection: article.category } : {}),
    ...(article.author ? { author: { "@type": "Person", name: article.author } } : {}),
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png` } },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function articleMetaTags(article) {
  const title = `${article.title || "Untitled"} | U#`;
  const description = describe(article);
  const cover = article.coverMedium || article.cover;
  const image = cover ? getOptimizedImageUrl(cover, { width: 1200, format: "jpg" }) : `${SITE_URL}/icons/icon-512.png`;
  const url = articleUrl(article.editionNo);
  const tags = [
    ["name", "description", description],
    ["property", "og:site_name", SITE_NAME],
    ["property", "og:type", "article"],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", url],
    ["property", "og:image", image],
    ["name", "twitter:card", cover ? "summary_large_image" : "summary"],
  ];
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ...tags.map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`),
    `<script type="application/ld+json">${articleJsonLd(article, image)}</script>`,
  ].join("\n    ");
}

// Replace the site-wide defaults (marked data-uf-og in index.html) with article tags.
export function injectArticleMeta(html, article) {
  const withoutDefaults = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta[^>]*\bdata-uf-og\b[^>]*>\s*/gi, "");
  return withoutDefaults.replace(/<\/head>/i, `  ${articleMetaTags(article)}\n  </head>`);
}

export function sitemapXml(articles, now = new Date()) {
  const entry = (loc, lastmod) =>
    `  <url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ""}</url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entry(`${SITE_URL}/`, now.toISOString()),
    entry(`${SITE_URL}/about`),
    ...articles.filter((article) => article.editionNo).map((article) => entry(articleUrl(article.editionNo), article.updatedAt)),
    "</urlset>",
    "",
  ].join("\n");
}

export function rssXml(articles, now = new Date()) {
  const item = (article) => [
    "    <item>",
    `      <title>${escapeHtml(article.title || "Untitled")}</title>`,
    `      <link>${escapeHtml(articleUrl(article.editionNo))}</link>`,
    `      <guid isPermaLink="true">${escapeHtml(articleUrl(article.editionNo))}</guid>`,
    `      <description>${escapeHtml(describe(article))}</description>`,
    article.category ? `      <category>${escapeHtml(article.category)}</category>` : "",
    article.createdAt ? `      <pubDate>${new Date(article.createdAt).toUTCString()}</pubDate>` : "",
    "    </item>",
  ].filter(Boolean).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeHtml(SITE_NAME)}</title>`,
    `    <link>${SITE_URL}/</link>`,
    "    <description>UNFRAME 매거진 U#. 에디션 번호로 발행하는 전시·예술 기록.</description>",
    "    <language>ko</language>",
    `    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />`,
    ...articles.filter((article) => article.editionNo).map(item),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
