import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('the CSP allows exactly the inline scripts in index.html', async () => {
  const [html, headers] = await Promise.all([read('../index.html'), read('../public/_headers')]);
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  const policy = headers.match(/Content-Security-Policy-Report-Only: (.+)/)[1];
  const allowed = policy.match(/script-src ([^;]+)/)[1].split(' ').filter((source) => source.startsWith("'sha256-"));
  assert.deepEqual(allowed.sort(), inline.sort(), 'update the script-src hash in public/_headers');
});

test('third-party stylesheets are pinned to a version', async () => {
  const html = await read('../index.html');
  for (const [, href] of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) {
    if (href.startsWith('https://cdn.jsdelivr.net/')) assert.match(href, /@v?\d+\.\d+\.\d+\//, href);
  }
});
