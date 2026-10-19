const KEY = 'uf_app_shell_recovery_v2';
let pending = null;

export function isAppShellError(error) {
  return /failed to fetch dynamically imported module|importing a module script failed|loading chunk|module script|stale service worker|mime type/i.test(String(error?.message || error || ''));
}

// Invalidate only the app shell, never authentication or editor recovery data.
export async function recoverAppShell({ manual = false, reason = 'chunk-load', browser = window } = {}) {
  if (pending) return pending;
  const pathname = browser.location.pathname;
  if (!manual && (browser.navigator.onLine === false || /^\/(write|edit)(\/|$)/.test(pathname))) return false;
  const now = Date.now();
  try {
    const last = JSON.parse(browser.sessionStorage.getItem(KEY) || 'null');
    if (!manual && last && now - last.at < 300000) return false;
    browser.sessionStorage.setItem(KEY, JSON.stringify({ at: now, path: pathname, reason }));
  } catch {
    // Without a persistent loop guard, leave automatic recovery to the user.
    if (!manual) return false;
  }
  pending = (async () => {
    const cleanup = Promise.allSettled([
      (async () => {
        const registrations = await browser.navigator.serviceWorker?.getRegistrations?.() || [];
        await Promise.all(registrations.filter((registration) => registration.scope === `${browser.location.origin}/`).map((registration) => registration.unregister()));
      })(),
      (async () => {
        const names = await browser.caches?.keys?.() || [];
        await Promise.all(names.filter((name) => /^(workbox-precache|uf-hashed-assets|vite-pwa)/.test(name)).map((name) => browser.caches.delete(name)));
      })(),
    ]);
    let timer;
    await Promise.race([cleanup, new Promise((resolve) => { timer = browser.setTimeout(resolve, 3000); })]);
    browser.clearTimeout(timer);
    browser.location.reload();
    return true;
  })();
  try { return await pending; } finally { pending = null; }
}
