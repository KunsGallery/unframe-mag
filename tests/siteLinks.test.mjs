import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSiteUrl, safeSiteUrl, normalizeNetworkConfig, getSiteLinks } from "../src/lib/siteLinks.js";

test("normalizes HTTPS input and treats blank values as unconfigured", () => {
  assert.equal(normalizeSiteUrl("  HTTPS://EXAMPLE.COM/signup?q=letter#join  "), "https://example.com/signup?q=letter#join");
  for (const value of [null, undefined, "", "   "]) assert.equal(normalizeSiteUrl(value), "");
  assert.equal(normalizeSiteUrl("https://example.com"), "https://example.com/");
});

test("rejects unsafe schemes, ambiguous URLs, credentials and malformed inputs", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "http://example.com", "//example.com", "/privacy", "example.com", "https://", "https:///example.com", "https://user:pass@example.com", "https://example.com\\@evil.com", "https://exam\nple.com", "https://example.com\n", "https://example.com/a b", {}, 42]) {
    assert.throws(() => normalizeSiteUrl(value), /HTTPS/);
    assert.equal(safeSiteUrl(value), "");
  }
});

test("normalizes stored config, filters unsafe links and preserves network picks", () => {
  const config = normalizeNetworkConfig({ links: { gallery: " https://gallery.example ", music: "javascript:alert(1)" }, newsletterUrl: "https://letters.example/join", privacyUrl: "#", termsUrl: "http://example.com", featuredEditionNos: [1, "002"] });
  assert.deepEqual(config.links, { playlist: "", podcast: "", gallery: "https://gallery.example/", music: "" });
  assert.equal(config.newsletterUrl, "https://letters.example/join");
  assert.equal(config.privacyUrl, "");
  assert.equal(config.termsUrl, "");
  assert.deepEqual(config.featuredEditionNos, ["1", "002"]);
  assert.equal(normalizeNetworkConfig(null).newsletterUrl, "");
});

test("exposes safe flat footer and network links", () => {
  assert.deepEqual(getSiteLinks({
    links: { playlist: "https://example.com/playlist", podcast: "https://example.com/podcast", gallery: "https://example.com/gallery", music: "https://example.com/music" },
    newsletterUrl: " https://example.com/signup ",
    privacyUrl: "https://example.com/privacy",
    termsUrl: "https://example.com/terms",
  }), {
    playlist: "https://example.com/playlist",
    podcast: "https://example.com/podcast",
    gallery: "https://example.com/gallery",
    music: "https://example.com/music",
    newsletter: "https://example.com/signup",
    privacy: "https://example.com/privacy",
    terms: "https://example.com/terms",
  });
  const empty = { playlist: "", podcast: "", gallery: "", music: "", newsletter: "", privacy: "", terms: "" };
  assert.deepEqual(getSiteLinks(null), empty);
  assert.deepEqual(getSiteLinks({ links: { gallery: "javascript:alert(1)" }, privacyUrl: "http://example.com", termsUrl: "#", newsletterUrl: "//example.com" }), empty);
});
