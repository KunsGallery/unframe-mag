// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";

import ListPage from "./pages/ListPage";
import ViewPage from "./pages/ViewPage";
import EditorPage from "./pages/EditorPage";

import { getParam, subscribe } from "./utils/router";

/**
 * ============================================================================
 * ✅ Theme (로컬 저장)
 * - iframe 환경에서도 localStorage가 막히는 경우가 있어 try/catch 유지
 * ============================================================================
 */
const THEME_KEY = "UF_THEME_V1";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // ✅ 기본은 light가 안전(글 안보임 방지)
  return prefersDark ? "dark" : "light";
}

export default function App() {
  /**
   * ============================================================================
   * ✅ routeSearch: "현재 URL의 search 문자열"을 state로 관리
   * - go()가 pushState + popstate를 발생시키면,
   *   아래 subscribe()가 routeSearch를 바꿔서 App이 리렌더됨
   * ============================================================================
   */
  const [routeSearch, setRouteSearch] = useState(window.location.search || "");

  useEffect(() => {
    const off = subscribe((search) => setRouteSearch(search));
    return off;
  }, []);

  // ✅ routeSearch 기준으로 mode/id 읽기 (중요: window.location.search 직접 읽지 않음)
  const mode = getParam("mode", routeSearch) || "list";
  const id = getParam("id", routeSearch);

  // ✅ theme 전역 상태
  const [theme, setTheme] = useState(getInitialTheme());

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useMemo(() => {
    return () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // ✅ 페이지 라우팅
  if (mode === "view") return <ViewPage id={id} theme={theme} toggleTheme={toggleTheme} />;
  if (mode === "editor") return <EditorPage id={id} theme={theme} toggleTheme={toggleTheme} />;
  return <ListPage theme={theme} toggleTheme={toggleTheme} />;
}
