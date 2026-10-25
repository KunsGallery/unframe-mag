import { findPublishedArticle, injectArticleMeta } from "../lib/publishedArticles.js";

// Link previews (KakaoTalk, Instagram, search engines) do not run the SPA,
// so put each article's title, summary and cover into the served HTML.
export default async function articleMeta(request, context) {
  const response = await context.next();
  if (!response.ok || !String(response.headers.get("content-type")).includes("text/html")) return response;

  const editionNo = decodeURIComponent(new URL(request.url).pathname.split("/")[2] || "");
  if (!/^[0-9A-Za-z_-]{1,32}$/.test(editionNo)) return response;

  let article = null;
  try {
    article = await findPublishedArticle(editionNo);
  } catch (error) {
    console.error("[article-meta] lookup failed:", error?.message || error);
  }
  if (!article) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injectArticleMeta(await response.text(), article), { status: response.status, headers });
}

export const config = { path: "/article/*" };
