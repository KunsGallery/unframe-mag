// src/lib/editorInput.js
// Promise-based replacement for window.prompt inside the editor. EditorInputDialog
// answers the request; without a mounted dialog it falls back to window.prompt.
export const EDITOR_INPUT_EVENT = "uf:editor-input";
let hosts = 0;

export function registerEditorInputHost() {
  hosts += 1;
  return () => { hosts -= 1; };
}

// options: { title, label, placeholder, defaultValue, hint, inputMode, confirmLabel, allowEmpty, validate(value) -> message | "" }
// Resolves to the trimmed value, "" when allowEmpty and cleared, or null when cancelled.
export function requestEditorInput(options = {}) {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!hosts) {
    const value = window.prompt(options.label || options.title || "", options.defaultValue || "");
    return Promise.resolve(value === null ? null : value.trim());
  }
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(EDITOR_INPUT_EVENT, { detail: { ...options, resolve } }));
  });
}

// "example.com/a" -> "https://example.com/a"; leaves schemes, paths and anchors alone.
export function withLinkScheme(value) {
  const text = String(value || "").trim();
  if (!text || /^[a-z][a-z0-9+.-]*:/i.test(text) || /^[/#]/.test(text)) return text;
  return /^[^\s/]+\.[^\s/]+/.test(text) ? `https://${text}` : text;
}
