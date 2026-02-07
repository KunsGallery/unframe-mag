// src/utils/router.js
// ------------------------------------------------------
// ✅ 목적: ?mode=... 같은 쿼리 기반 라우팅을 "새로고침 없이" 안전하게 동작시키기
// - pushState/replaceState + popstate + 커스텀 이벤트를 통합
// - React(App)에서 이 라우터를 구독(subscribe)하면 URL 바뀔 때마다 리렌더 가능
// ------------------------------------------------------

const listeners = new Set();

/** ✅ 현재 location 정보를 문자열로 반환 (App에서 state로 들고 있을 값) */
export function getLocationKey() {
  // pathname까지 포함하면 ?mode만 바뀌어도 확실히 달라짐
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** ✅ 구독 등록: URL 바뀔 때마다 cb 호출 */
export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** ✅ 구독자들에게 변경 알림 */
export function notify() {
  for (const cb of listeners) {
    try {
      cb(getLocationKey());
    } catch (e) {
      console.error("router notify error:", e);
    }
  }
}

/** ✅ 쿼리 파라미터 읽기 */
export function getParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

/** ✅ 쿼리 파라미터 세팅(기존 파라미터 유지하면서 부분만 변경) */
export function setParam(key, value, { replace = false } = {}) {
  const url = new URL(window.location.href);
  if (value === null || value === undefined || value === "") url.searchParams.delete(key);
  else url.searchParams.set(key, String(value));

  if (replace) window.history.replaceState({}, "", url.toString());
  else window.history.pushState({}, "", url.toString());

  // ✅ pushState/replaceState는 popstate를 자동으로 안 일으킴 → 직접 notify
  notify();
}

/**
 * ✅ 새로고침 없이 URL 이동
 * - 내부적으로 pushState 후 notify() 해서 App이 즉시 반응하게 함
 */
export function go(url) {
  // url이 "?mode=list" 같은 형태여도 문제 없게 처리
  const next = url.startsWith("http") ? url : `${window.location.pathname}${url.startsWith("?") ? url : `?${url}`}`;
  window.history.pushState({}, "", next);
  notify();
}

/** ✅ replace 이동(히스토리 쌓기 싫을 때) */
export function replace(url) {
  const next = url.startsWith("http") ? url : `${window.location.pathname}${url.startsWith("?") ? url : `?${url}`}`;
  window.history.replaceState({}, "", next);
  notify();
}

/** ✅ 뒤로/앞으로 이동 */
export function back() {
  window.history.back();
}

/** ✅ 섹션 스크롤 이동용 */
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ------------------------------------------------------
// ✅ 브라우저 뒤로/앞으로(popstate)에서도 notify 되게 연결
// ------------------------------------------------------
window.addEventListener("popstate", () => {
  notify();
});
