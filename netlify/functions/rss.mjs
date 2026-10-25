import { listRecentArticles, rssXml } from "../lib/publishedArticles.js";

export default async function rss() {
  try {
    return new Response(rssXml(await listRecentArticles()), {
      headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("[rss] failed:", error?.message || error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const config = { path: "/rss.xml" };
