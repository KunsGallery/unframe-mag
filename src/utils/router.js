// src/utils/router.js
export function getParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}
export function go(url) {
  window.location.href = url;
}
