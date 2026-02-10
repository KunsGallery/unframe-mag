const KEY = "UF_SAVED_IDS_V1";

export function getSavedIds() {
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.map(Number).filter((n) => !Number.isNaN(n)) : [];
  } catch {
    return [];
  }
}

export function toggleSaved(id) {
  const ids = getSavedIds();
  const n = Number(id);
  const has = ids.includes(n);
  const next = has ? ids.filter((x) => x !== n) : [n, ...ids];
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event("UF_SAVED_CHANGED"));
  return { saved: !has, ids: next };
}

export function onSavedChanged(cb) {
  function handler() {
    cb(getSavedIds());
  }
  window.addEventListener("UF_SAVED_CHANGED", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("UF_SAVED_CHANGED", handler);
    window.removeEventListener("storage", handler);
  };
}
