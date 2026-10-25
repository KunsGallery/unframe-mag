import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import ErrorBoundary from "./components/debug/ErrorBoundary.jsx";
import "./styles/index.css";
import { reportClientError } from "./lib/runtimeDiagnostics";
import { isAppShellError, recoverAppShell } from "./lib/appShellRecovery";
import { startWebVitals } from "./lib/webVitals";

let updateSW = () => {};
window.addEventListener("uf:apply-update", () => updateSW(true));

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

window.addEventListener("error", (event) => {
  reportClientError(event.error || event.message, { source: "window" });
  if (isAppShellError(event.error || event.message)) {
    void recoverAppShell({ reason: "window-error" });
  }
});

window.addEventListener("unhandledrejection", (event) => {
  reportClientError(event.reason, { source: "promise" });
  if (isAppShellError(event.reason)) {
    void recoverAppShell({ reason: "unhandled-rejection" });
  }
});

void startWebVitals().catch(() => {});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!/^\/(write|edit)(\/|$)/.test(window.location.pathname)) window.location.reload();
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
    window.dispatchEvent(new Event("uf:update-available"));
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary pathname={window.location.pathname}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
