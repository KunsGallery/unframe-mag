import assert from 'node:assert/strict';
import test from 'node:test';
import { isPrivateAddress, parseLinkPreview, parsePreviewUrl } from '../netlify/lib/linkPreview.js';
import { linkCardAttrs } from '../src/lib/linkCard.js';

test('only public http(s) addresses on standard ports are accepted', () => {
  assert.equal(parsePreviewUrl('https://gallery.example.com/room#a').href, 'https://gallery.example.com/room');
  for (const bad of ['javascript:alert(1)', 'ftp://example.com', 'http://localhost:3000', 'http://intranet', 'https://user:pw@example.com', 'https://example.com:8443', 'http://printer.local', 'not a url']) {
    assert.equal(parsePreviewUrl(bad), null, bad);
  }
});

test('private, loopback, link-local and metadata addresses are blocked', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.0.10', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '211.45.2.9', '2606:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip);
});

test('Open Graph tags win, with HTML fallbacks, entities decoded and image made absolute', () => {
  const html = `<html><head><title>Fallback &amp; title</title>
    <meta name="description" content="plain description">
    <meta property="og:title" content="Kuns &quot;Virtual&quot; Gallery">
    <meta content='/og/cover.jpg' property='og:image'>
    <meta property="og:site_name" content="KUNS GALLERY">
  </head><body><meta property="og:title" content="ignored body tag"></body></html>`;
  assert.deepEqual(parseLinkPreview(html, 'https://kuns.example/virtual/room'), {
    url: 'https://kuns.example/virtual/room',
    title: 'Kuns "Virtual" Gallery',
    description: 'plain description',
    image: 'https://kuns.example/og/cover.jpg',
    siteName: 'KUNS GALLERY',
  });
});

test('a page without metadata falls back to its host; unsafe images are dropped', () => {
  const preview = parseLinkPreview('<head><meta property="og:image" content="javascript:alert(1)"></head>', 'https://www.example.org/x');
  assert.equal(preview.title, 'example.org');
  assert.equal(preview.siteName, 'example.org');
  assert.equal(preview.image, '');
});

test('linkCardAttrs fills a usable card even when the preview failed', () => {
  assert.deepEqual(linkCardAttrs('https://gallery.example.com/v'), { url: 'https://gallery.example.com/v', title: 'gallery.example.com', description: '', image: '', siteName: 'gallery.example.com' });
  assert.equal(linkCardAttrs('https://a.kr', { title: 'T', url: 'https://a.kr/final' }).url, 'https://a.kr/final');
});
