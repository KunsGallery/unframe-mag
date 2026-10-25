import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_TAGS, normalizeTags } from '../src/lib/articleTags.js';
import { publicationChecks } from '../src/lib/publicationChecks.js';
import { DEFAULT_SHARE_DESCRIPTION, shareDescription, shareTitle } from '../src/lib/shareMeta.js';
import { articleMetaTags } from '../netlify/lib/publishedArticles.js';

test('tags accept arrays or comma text and drop hashes, blanks and duplicates', () => {
  assert.deepEqual(normalizeTags('#회화,  설치  미술 , 회화,,#Photo, photo'), ['회화', '설치 미술', 'Photo']);
  assert.deepEqual(normalizeTags([' a ', null, 'A', 'b']), ['a', 'b']);
  assert.equal(normalizeTags(Array.from({ length: 20 }, (_, index) => `t${index}`)).length, MAX_TAGS);
  assert.equal(normalizeTags(['x'.repeat(50)])[0].length, 30);
  assert.deepEqual(normalizeTags(undefined), []);
});

test('share text prefers the lead text, then the subtitle, then the site default', () => {
  assert.equal(shareDescription({ excerpt: ' 리드 ', subtitle: '부제' }), '리드');
  assert.equal(shareDescription({ excerpt: '  ', subtitle: '부제' }), '부제');
  assert.equal(shareDescription({}), DEFAULT_SHARE_DESCRIPTION);
  assert.equal(shareTitle({ title: '  ' }), 'Untitled | U#');
  assert.match(articleMetaTags({ editionNo: '001', title: 'T', subtitle: '부제', excerpt: '리드' }), /og:description" content="리드"/);
});

test('publication warns, last, when nothing describes the article for sharing', () => {
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }] };
  const bare = publicationChecks({ title: 'T', cover: 'c.jpg', content });
  assert.deepEqual(bare.warnings.map((issue) => issue.code), ['missing-description']);
  assert.equal(bare.warnings[0].field, 'excerpt');
  assert.equal(bare.canPublish, true);
  assert.equal(publicationChecks({ title: 'T', cover: 'c.jpg', subtitle: '부제', content }).warnings.length, 0);
  assert.equal(publicationChecks({ title: 'T', cover: 'c.jpg', excerpt: '리드', content }).warnings.length, 0);
});
