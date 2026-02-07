// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";

import ListPage from "./pages/ListPage";
import ViewPage from "./pages/ViewPage";
import EditorPage from "./pages/EditorPage";

import { getParam } from "./utils/router";

/**
 * ✅ 테마 저장 키 (로컬)
 * - 기기/브라우저별로 저장됨
 */
const THEME_KEY = "UF_THEME_V1";

/**
 * ✅ prefers-color-scheme(시스템 설정) 반영 + localStorage 우선
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}

  // 저장값이 없으면 OS 설정 따르기 (기본값)
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // ✅ 지금 “글 안보임” 문제를 방지하려면 기본을 light로 두는 게 안전
  return prefersDark ? "dark" : "light";
}

export default function App() {
  const mode = getParam("mode") || "list";
  const id = getParam("id"); // view/editor에서 사용

  // ✅ 테마 전역 상태
  const [theme, setTheme] = useState(getInitialTheme());

  // ✅ theme 변경될 때마다 <html data-theme="..."> 적용
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  // ✅ 버튼에서 쓰기 편하게 토글 함수 제공
  const toggleTheme = useMemo(() => {
    return () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // ✅ pages에 theme/toggleTheme를 prop으로 내려주면
  //    페이지별로 TopNav에서 동일 UX를 만들기 쉬움
  if (mode === "view") return <ViewPage id={id} theme={theme} toggleTheme={toggleTheme} />;
  if (mode === "editor") return <EditorPage id={id} theme={theme} toggleTheme={toggleTheme} />;
  return <ListPage theme={theme} toggleTheme={toggleTheme} />;
}
