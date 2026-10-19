import assert from 'node:assert/strict';
import test from 'node:test';
import { articleImageUrls, replaceArticleImages, transformImageHtml } from '../scripts/lib/articleImages.mjs';

const old = 'https://i.ibb.co/abc/photo.jpg';
const next = 'https://res.cloudinary.com/gallery/image/upload/v1/photo.jpg';
const html = `<p>Keep ${old} in text &amp; caption.</p><div data-uf-gallery="true" data-images='[ { "src": "${old}", "caption": "A &amp; B", "span": 2, "positionX": 31 } ]'><img src="${old}" data-original-src="${old}" alt="A &amp; B"></div>`;
test('image inventory parses encoded JSON and deduplicates image addresses', () => {
  assert.deepEqual(articleImageUrls({ contentHTML: html, cover: old }), [old]);
});
test('migration changes image sources including serialized gallery JSON without changing prose or layout metadata', () => {
  const changed = replaceArticleImages({ contentHTML: html, cover: old, category: 'ART' }, { [old]: next });
  assert.equal(changed.cover, next);
  assert.match(changed.contentHTML, /Keep https:\/\/i\.ibb\.co\/abc\/photo.jpg in text &amp; caption/);
  assert.match(changed.contentHTML, /&quot;span&quot;:2/);
  assert.match(changed.contentHTML, /&quot;positionX&quot;:31/);
  assert.equal(changed.category, undefined);
  assert.deepEqual(articleImageUrls({ contentHTML: changed.contentHTML, cover: changed.cover }), [next]);
});
test('no mapping is a byte-identical no-op; malformed legacy blocks and absent fields remain untouched', () => {
  assert.equal(transformImageHtml(html, (url) => url), html);
  assert.deepEqual(replaceArticleImages({ contentHTML: html }, {}), {});
  assert.deepEqual(replaceArticleImages({}, {}), {});
  const invalid = '<div data-images="broken-json"><p>Original</p></div>';
  assert.equal(transformImageHtml(invalid, (url) => url), invalid);
});
