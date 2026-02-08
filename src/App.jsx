// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ListPage from "./pages/ListPage";
import ViewPage from "./pages/ViewPage";
import EditorPage from "./pages/EditorPage";

/**
 * ✅ 테마 저장 키 (로컬)
 * - 기기/브라우저별로 저장됨
 */
const THEME_KEY = "UF_THEME_V1";

/**
 * ✅ 시스템 설정 + localStorage 우선
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

export default function App() {
  // ✅ 전역 테마
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

  return (
    <Routes>
      {/* ✅ List: https://magazine.unframe.kr/ */}
      <Route path="/" element={<ListPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* ✅ View: https://magazine.unframe.kr/article/123 */}
      <Route path="/article/:id" element={<ViewPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* ✅ Write: https://magazine.unframe.kr/write?id=123  (id 없으면 새 글) */}
      <Route path="/write" element={<EditorPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* ✅ 나머지는 홈으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
