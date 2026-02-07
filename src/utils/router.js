// src/utils/router.js

/**
 * ============================================================================
 * ✅ 아주 단순한 "쿼리스트링 기반 라우터" 유틸
 * - Imweb iframe에서도 안정적으로 동작하게 설계
 * - 핵심: pushState 후 popstate를 발생시키고,
 *         App.jsx가 subscribe()로 이를 감지해 리렌더하게 만든다.
 * ============================================================================
 */

/** 현재 location.search를 문자열로 가져오기 */
export function getSearch() {
  return window.location.search || "";
}

/** 쿼리 파라미터 읽기 (기본: 현재 URL 기준) */
export function getParam(key, search = getSearch()) {
  const params = new URLSearchParams(search);
  return params.get(key);
}

/**
 * ✅ 새로고침 없이 이동
 * - 내부적으로 history.pushState() 실행
 * - 그리고 popstate 이벤트를 강제로 발생시켜, 구독자(App)가 즉시 반응하도록 함
 */
export function go(url, { replace = false } = {}) {
  const next = url.startsWith("?") ? url : `?${url}`;

  if (replace) window.history.replaceState({}, "", next);
  else window.history.pushState({}, "", next);

  // ✅ React가 URL 변화를 인지하도록 popstate를 발생
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * ✅ URL 변경(popstate)을 구독하는 함수
 * - App.jsx에서 subscribe()를 걸어두면,
 *   go()로 이동할 때마다 App이 리렌더된다.
 */
export function subscribe(onChange) {
  if (typeof onChange !== "function") return () => {};

  const handler = () => onChange(getSearch());

  window.addEventListener("popstate", handler);
  // ✅ 최초 1회 즉시 호출(현재 URL을 App에 반영)
  handler();

  return () => window.removeEventListener("popstate", handler);
}

/** ✅ 섹션 스크롤 이동 */
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
