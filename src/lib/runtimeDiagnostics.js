const KEY = "uf_runtime_diagnostics_v1";
const seen = new Set();

function classify(error) {
  const code = String(error?.code || "");
  if (/^image-(load|upload-[a-z-]+)$/.test(code)) return code;
  if (/^auth\/[a-z-]+$/.test(code)) return code;
  const message = String(error?.message || error || "");
  if (/fetch dynamically imported|module script|loading chunk/i.test(message)) return "chunk-load";
  if (/permission|denied/i.test(message)) return "permission-denied";
  if (/network|fetch|offline/i.test(message)) return "network";
  return "runtime";
}

export function getRuntimeDiagnostics() {
  try {
    const records = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(records) ? records.slice(-20) : [];
  } catch {
    return [];
  }
}

export function reportClientError(error, { source = "window" } = {}) {
  const event = {
    code: classify(error),
    source: String(source).replace(/[^a-z-]/g, "").slice(0, 40),
    route: window.location.pathname.replace(/\/(article|edit)\/[^/]+/g, "/$1/:id"),
    browser: /Firefox/.test(navigator.userAgent) ? "Firefox" : /Chrome|Chromium|CriOS/.test(navigator.userAgent) ? "Chromium" : /Safari/.test(navigator.userAgent) ? "Safari" : "Other",
    build: import.meta.env.VITE_BUILD_VERSION || "local",
    at: new Date().toISOString(),
  };
  const key = JSON.stringify({ ...event, at: "" });
  if (seen.has(key)) return;
  seen.add(key);
  console.error("[uf:error]", event);
  try {
    localStorage.setItem(KEY, JSON.stringify([...getRuntimeDiagnostics(), event].slice(-20)));
  } catch {
    // Error diagnostics must never block the application.
  }
  if (import.meta.env.PROD) {
    fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event), keepalive: true }).catch(() => {});
  }
}
