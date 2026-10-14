import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationChecks, isPublicationLinkValid } from '../src/lib/publicationChecks.js';

const doc = (...content) => ({ type: 'doc', content });
const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const check = (content, meta = {}) => publicationChecks({ title: '기사', cover: 'https://example.com/cover.jpg', content, ...meta });

test('missing title/body block publication; cover is only a warning', () => {
  const result = publicationChecks();
  assert.deepEqual(result.errors.map((issue) => issue.code), ['missing-title', 'missing-body']);
  assert.equal(result.warnings[0].code, 'missing-cover');
  assert.equal(result.canPublish, false);
  assert.equal(check(doc(paragraph('본문')), { cover: '' }).canPublish, true);
  assert.equal(check(doc(paragraph(' \n\t')), { title: '  ' }).errors.length, 2);
});

test('nested UTF-16 text and empty paragraphs preserve ProseMirror positions', () => {
  const content = doc({ type: 'paragraph' }, paragraph('😀'), {
    type: 'blockquote', content: [{ type: 'paragraph', content: [{
      type: 'text', text: '링크', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
    }] }],
  }, { type: 'ufImage', attrs: { src: 'https://example.com/a.jpg' } });
  const result = check(content);
  assert.equal(result.warnings.find((issue) => issue.code === 'invalid-link').position, 8);
  assert.equal(result.warnings.find((issue) => issue.code === 'missing-alt').position, 12);
});

test('galleries identify empty sources and individual missing alt without mutation', () => {
  const content = doc({ type: 'gallery', attrs: { images: [{ src: ' ' }] } }, {
    type: 'slideGallery', attrs: { images: [{ src: 'https://example.com/a.jpg', alt: '' }, { src: 'https://example.com/b.jpg', alt: '작품' }] },
  });
  const before = JSON.stringify(content);
  const result = check(content);
  assert.equal(result.canPublish, true);
  assert.equal(result.warnings[0].code, 'empty-gallery');
  assert.equal(result.warnings[1].imageIndex, 0);
  assert.equal(result.warnings[1].position, 1);
  assert.equal(JSON.stringify(content), before);
  assert.equal(check(doc({ type: 'gallery', attrs: { images: null } })).canPublish, false);
});

test('media counts as body; unsupported embeds and decoration do not', () => {
  assert.equal(check(doc({ type: 'ufImage', attrs: { src: 'a.jpg', alt: '작품' } })).canPublish, true);
  assert.equal(check(doc({ type: 'ufPlaylist', attrs: { url: 'https://open.spotify.com/playlist/abc' } })).canPublish, true);
  const invalid = check(doc({ type: 'ufPodcast', attrs: { embedUrl: 'https://evil.example/embed' } }, { type: 'ufDivider' }));
  assert.equal(invalid.canPublish, false);
  assert.equal(invalid.warnings[0].code, 'invalid-link');
});

test('links allow navigation protocols and reject unsafe or malformed destinations', () => {
  for (const url of ['https://example.com', 'http://example.com/a', '/view/1', '#section', 'mailto:a@example.com', 'tel:+821012345678']) assert.equal(isPublicationLinkValid(url), true, url);
  for (const url of ['', '//evil.example', 'javascript:alert(1)', 'data:text/html,x', 'https://', 'https://user:pass@example.com', 'https://example.com\n', 'https://example.com\\evil', 'example.com']) assert.equal(isPublicationLinkValid(url), false, url);
});
