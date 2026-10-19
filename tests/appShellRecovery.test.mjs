import assert from 'node:assert/strict';
import test from 'node:test';
import { isAppShellError, recoverAppShell } from '../src/lib/appShellRecovery.js';

function harness(path = '/') {
  const data = new Map(); const deleted = []; const removed = [];
  let reloads = 0;
  const browser = {
    location: { pathname: path, origin: 'https://magazine.test', reload: () => { reloads++; } },
    sessionStorage: { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) },
    navigator: { onLine: true, serviceWorker: { getRegistrations: async () => [
      { scope: 'https://magazine.test/', unregister: async () => removed.push('app') },
      { scope: 'https://magazine.test/other/', unregister: async () => removed.push('other') },
    ] } },
    caches: { keys: async () => ['workbox-precache-v2-site', 'uf-hashed-assets', 'editor-drafts', 'auth-data'], delete: async (name) => deleted.push(name) },
    setTimeout, clearTimeout,
  };
  return { browser, data, deleted, removed, reloads: () => reloads };
}
test('chunk recovery removes only stale app shell caches and root service worker, then reloads once', async () => {
  const h = harness('/article/one');
  assert.equal(await recoverAppShell({ browser: h.browser }), true);
  assert.deepEqual(h.deleted, ['workbox-precache-v2-site', 'uf-hashed-assets']);
  assert.deepEqual(h.removed, ['app']);
  assert.equal(h.reloads(), 1);
  assert.equal(await recoverAppShell({ browser: h.browser }), false);
  assert.equal(h.reloads(), 1);
  assert.equal(await recoverAppShell({ browser: h.browser, manual: true }), true);
  assert.equal(h.reloads(), 2);
});
test('automatic recovery never reloads active editors, offline tabs, or tabs without a persistent loop guard', async () => {
  for (const path of ['/write', '/edit/article-id']) {
    const h = harness(path);
    assert.equal(await recoverAppShell({ browser: h.browser }), false);
    assert.equal(h.reloads(), 0);
    assert.deepEqual(h.deleted, []);
  }
  const h = harness(); h.browser.navigator.onLine = false;
  assert.equal(await recoverAppShell({ browser: h.browser }), false);
  h.browser.navigator.onLine = true;
  h.browser.sessionStorage.getItem = () => { throw new Error('storage blocked'); };
  assert.equal(await recoverAppShell({ browser: h.browser }), false);
  assert.equal(await recoverAppShell({ browser: h.browser, manual: true }), true);
});
test('cleanup failure still allows bounded recovery; unrelated errors never count as shell failures', async () => {
  const h = harness();
  h.browser.caches.keys = async () => { throw new Error('cache blocked'); };
  assert.equal(await recoverAppShell({ browser: h.browser }), true);
  assert.equal(h.reloads(), 1);
  assert.equal(isAppShellError(new Error('Failed to fetch dynamically imported module: /assets/old.js')), true);
  assert.equal(isAppShellError(new Error('Permission denied')), false);
});
