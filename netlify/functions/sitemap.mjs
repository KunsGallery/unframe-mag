import { listPublishedArticles, sitemapXml } from "../lib/publishedArticles.js";

export default async function sitemap() {
  try {
    return new Response(sitemapXml(await listPublishedArticles()), {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("[sitemap] failed:", error?.message || error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const config = { path: "/sitemap.xml" };
