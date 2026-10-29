// Link card metadata: URL checks and Open Graph parsing for /api/link-preview.
// Pure functions so they can be tested without network access.

const MAX_TEXT = { title: 160, description: 300, siteName: 80 };

export function parsePreviewUrl(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  if (url.port && !["80", "443"].includes(url.port)) return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  url.hash = "";
  return url;
}

// Loopback, private, link-local (incl. cloud metadata), CGNAT, multicast and reserved ranges.
export function isPrivateAddress(address) {
  const ip = String(address || "").toLowerCase().replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  return ip === "::" || ip === "::1" || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, code) => {
    const key = code.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith("#")) return String.fromCodePoint(Number(key.slice(1)));
    return match;
  });
}

const clean = (value, max) => {
  const text = decodeEntities(String(value || "")).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([a-zA-Z_:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? "";
  }
  return result;
}

function absoluteHttpUrl(value, base) {
  try {
    const url = new URL(decodeEntities(String(value || "").trim()), base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function parseLinkPreview(html, pageUrl) {
  const head = String(html || "").slice(0, 400_000).split(/<\/head>/i)[0];
  const meta = {};
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    const key = (attrs.property || attrs.name || "").toLowerCase();
    if (key && attrs.content !== undefined && !(key in meta)) meta[key] = attrs.content;
  }
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const host = new URL(pageUrl).hostname.replace(/^www\./, "");
  return {
    url: pageUrl,
    title: clean(meta["og:title"] || meta["twitter:title"] || titleTag || host, MAX_TEXT.title),
    description: clean(meta["og:description"] || meta["twitter:description"] || meta.description, MAX_TEXT.description),
    image: absoluteHttpUrl(meta["og:image:secure_url"] || meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] || meta["twitter:image:src"], pageUrl),
    siteName: clean(meta["og:site_name"] || host, MAX_TEXT.siteName),
  };
}
