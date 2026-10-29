import { lookup } from "node:dns/promises";
import { isPrivateAddress, parseLinkPreview, parsePreviewUrl } from "../lib/linkPreview.js";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 6000;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Refuse hosts that resolve to private or internal addresses (checked again on every redirect).
async function assertPublicHost(url) {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("blocked-host");
}

async function readLimited(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    chunks.push(value);
    // The <head> is all we need; stop early once it has been read or the cap is hit.
    if (size >= MAX_BYTES || /<\/head>/i.test(new TextDecoder().decode(value))) { await reader.cancel().catch(() => {}); break; }
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

// Editor-only helper: reads a page's Open Graph tags for a link card. Same-origin POST.
export default async function handler(request) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  let target;
  try {
    const body = await request.text();
    if (body.length > 2048) return new Response(null, { status: 413 });
    target = parsePreviewUrl(JSON.parse(body)?.url);
  } catch {
    return json(400, { error: "invalid-request" });
  }
  if (!target) return json(400, { error: "invalid-url" });

  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    let url = target;
    for (let hop = 0; ; hop += 1) {
      await assertPublicHost(url);
      const response = await fetch(url, {
        redirect: "manual",
        signal,
        headers: { "User-Agent": "UNFRAMEMagLinkPreview/1.0 (+https://magazine.unframe.kr)", Accept: "text/html,application/xhtml+xml" },
      });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        if (hop >= MAX_REDIRECTS) return json(502, { error: "too-many-redirects" });
        const next = parsePreviewUrl(new URL(response.headers.get("location"), url).href);
        if (!next) return json(422, { error: "blocked-redirect" });
        url = next;
        continue;
      }
      if (!response.ok) return json(502, { error: "upstream-status", status: response.status });
      if (!/text\/html|application\/xhtml/i.test(response.headers.get("content-type") || "")) return json(422, { error: "not-html" });
      return json(200, parseLinkPreview(await readLimited(response), url.href));
    }
  } catch (error) {
    const code = error?.message === "blocked-host" ? 422 : error?.name === "TimeoutError" ? 504 : 502;
    return json(code, { error: error?.message === "blocked-host" ? "blocked-host" : "fetch-failed" });
  }
}

export const config = { path: "/api/link-preview" };
