import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { injectArticleMeta, sitemapXml } from '../netlify/lib/publishedArticles.js';

const article = {
  editionNo: '007', title: '빛과 "그림자" <전시>', subtitle: '부제 & 소개', author: '에디터',
  coverMedium: 'https://res.cloudinary.com/demo/image/upload/v1/cover.jpg',
};

test('article previews replace the site defaults with escaped article tags', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const result = injectArticleMeta(html, article);
  assert.equal((result.match(/<title>/g) || []).length, 1);
  assert.equal((result.match(/property="og:title"/g) || []).length, 1);
  assert.doesNotMatch(result, /data-uf-og/);
  assert.match(result, /<title>빛과 &quot;그림자&quot; &lt;전시&gt; \| U#<\/title>/);
  assert.match(result, /property="og:description" content="부제 &amp; 소개"/);
  assert.match(result, /property="og:url" content="https:\/\/magazine\.unframe\.kr\/article\/007"/);
  assert.match(result, /property="og:image" content="https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/f_jpg,q_auto,w_1200,c_limit\/v1\/cover\.jpg"/);
  assert.match(result, /<div id="root"><\/div>/);
});

test('articles without a cover fall back to the site icon and a small card', () => {
  const result = injectArticleMeta('<html><head><title>x</title></head></html>', { editionNo: '1', title: 'T' });
  assert.match(result, /og:image" content="https:\/\/magazine\.unframe\.kr\/icons\/icon-512\.png"/);
  assert.match(result, /twitter:card" content="summary"/);
});

test('sitemap lists published editions with their last update', () => {
  const xml = sitemapXml([{ editionNo: '007', updatedAt: '2026-10-20T01:02:03Z' }, { editionNo: null }], new Date('2026-10-25T00:00:00Z'));
  assert.match(xml, /<loc>https:\/\/magazine\.unframe\.kr\/article\/007<\/loc><lastmod>2026-10-20<\/lastmod>/);
  assert.equal((xml.match(/<url>/g) || []).length, 3);
});
