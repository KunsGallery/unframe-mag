import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import ErrorBoundary from "./components/debug/ErrorBoundary.jsx";
import "./styles/index.css";

let updateSW = () => {};

const RECOVERY_RELOAD_KEY = "uf_app_shell_recovery_reload_v1";
const CACHE_CLEANUP_KEY = "uf_cache_cleanup_20260820_nav2";

async function clearLegacyAppCachesOnce() {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    if (localStorage.getItem(CACHE_CLEANUP_KEY) === "1") return;
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => /workbox|precache|runtime|vite-pwa|unframe|uf/i.test(name))
        .map((name) => caches.delete(name))
    );
    localStorage.setItem(CACHE_CLEANUP_KEY, "1");
  } catch (e) {
    console.warn("[app shell] cache cleanup skipped", e);
  }
}

function reloadAppShellOnce(reason) {
  if (typeof window === "undefined") return;

  try {
    const last = JSON.parse(sessionStorage.getItem(RECOVERY_RELOAD_KEY) || "null");
    const samePath = last?.path === window.location.pathname;
    const recent = Date.now() - Number(last?.at || 0) < 15000;
    if (samePath && recent) return;

    sessionStorage.setItem(
      RECOVERY_RELOAD_KEY,
      JSON.stringify({ at: Date.now(), path: window.location.pathname, reason })
    );
  } catch {
    // If storage is unavailable, still try one browser-level recovery.
  }

  window.location.reload();
}

function isRecoverableAppShellError(value) {
  const message = String(value?.message || value?.reason?.message || value || "");
  return /failed to fetch dynamically imported module|importing a module script failed|loading chunk|module script|stale service worker|mime type/i.test(
    message
  );
}

window.addEventListener("error", (event) => {
  if (isRecoverableAppShellError(event.error || event.message)) {
    reloadAppShellOnce("window-error");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (isRecoverableAppShellError(event.reason)) {
    reloadAppShellOnce("unhandled-rejection");
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    reloadAppShellOnce("service-worker-controller-change");
  });
}

clearLegacyAppCachesOnce();

updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    registration?.update?.();
  },
  onOfflineReady() {
    console.log("App ready for offline use");
  },
  onNeedRefresh() {
    console.log("New content available, refreshing app shell");
    updateSW(true);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary pathname={window.location.pathname}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
