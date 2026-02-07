// src/utils/router.js

export function getParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

/**
 * ✅ 새로고침 없이 URL만 바꾸는 이동
 * - location.href 대신 history.pushState 사용
 * - pushState 후 popstate 이벤트를 강제로 발생시켜서
 *   App이 mode/page/cat 등을 다시 읽게 함
 */
export function go(url) {
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** ✅ 섹션 스크롤 이동용 */
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
