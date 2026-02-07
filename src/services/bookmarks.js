// src/services/bookmarks.js
// ✅ 로컬스토리지 기반 북마크 (비회원 OK)
// - 기기가 바뀌면 북마크도 바뀌는 이유: localStorage는 기기/브라우저별로 따로 저장됨

const KEY = "UF_BOOKMARKS_V1";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** ✅ 북마크된 글 id 배열 가져오기 (number[]) */
export function getSavedIds() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  const arr = safeParse(raw || "[]", []);
  return Array.isArray(arr) ? arr.map((n) => Number(n)).filter((n) => !Number.isNaN(n)) : [];
}

/** ✅ 북마크 저장 */
export function setSavedIds(ids) {
  if (typeof window === "undefined") return;
  const clean = Array.from(new Set((ids || []).map((n) => Number(n)).filter((n) => !Number.isNaN(n))));
  window.localStorage.setItem(KEY, JSON.stringify(clean));
}

/** ✅ 이 글이 북마크인지 */
export function isSaved(id) {
  const num = Number(id);
  if (Number.isNaN(num)) return false;
  return getSavedIds().includes(num);
}

/** ✅ 토글 (저장/해제) -> { saved:boolean, ids:number[] } */
export function toggleSaved(id) {
  const num = Number(id);
  if (Number.isNaN(num)) return { saved: false, ids: getSavedIds() };

  const ids = getSavedIds();
  const exists = ids.includes(num);

  const next = exists ? ids.filter((x) => x !== num) : [num, ...ids];
  setSavedIds(next);

  return { saved: !exists, ids: next };
}

/** ✅ 다른 탭에서 북마크 변경되면 감지하고 싶을 때 */
export function onSavedChanged(callback) {
  if (typeof window === "undefined") return () => {};

  function handler(e) {
    if (e.key === KEY) callback?.(getSavedIds());
  }

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
