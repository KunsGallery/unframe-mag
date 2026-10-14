export const NETWORK_LINK_KEYS = ["playlist", "podcast", "gallery", "music"];
export const SITE_LINK_FIELDS = [
  { key: "playlist", label: "Playlist", network: true },
  { key: "podcast", label: "Podcast", network: true },
  { key: "gallery", label: "Gallery Program", network: true },
  { key: "music", label: "Music Platform", network: true },
  { key: "newsletterUrl", label: "Newsletter signup URL" },
  { key: "privacyUrl", label: "Privacy URL" },
  { key: "termsUrl", label: "Terms URL" },
];

// Empty means unconfigured; invalid supplied values must never become anchors.
export function normalizeSiteUrl(value) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw new Error("Enter an HTTPS URL.");
  if ([...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    throw new Error("Enter an HTTPS URL without control characters.");
  }
  const input = value.trim();
  if (!input) return "";
  if (!/^https:\/\/[^/?#]/i.test(input) || /[\s\\]/u.test(input)) {
    throw new Error("Enter a complete HTTPS URL without spaces.");
  }
  let url;
  try { url = new URL(input); } catch { throw new Error("Enter a valid HTTPS URL."); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new Error("Enter an HTTPS URL without login credentials.");
  }
  return url.href;
}

export function safeSiteUrl(value) {
  try { return normalizeSiteUrl(value); } catch { return ""; }
}

export function normalizeNetworkConfig(value) {
  const data = value && typeof value === "object" ? value : {};
  return {
    ...data,
    links: Object.fromEntries(NETWORK_LINK_KEYS.map((key) => [key, safeSiteUrl(data.links?.[key])])),
    newsletterUrl: safeSiteUrl(data.newsletterUrl),
    privacyUrl: safeSiteUrl(data.privacyUrl),
    termsUrl: safeSiteUrl(data.termsUrl),
    featuredEditionNos: Array.isArray(data.featuredEditionNos) ? data.featuredEditionNos.map(String) : [],
  };
}

export function getSiteLinks(config) {
  const normalized = normalizeNetworkConfig(config);
  return {
    ...normalized.links,
    newsletter: normalized.newsletterUrl,
    privacy: normalized.privacyUrl,
    terms: normalized.termsUrl,
  };
}
