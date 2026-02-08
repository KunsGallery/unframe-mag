// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ListPage from "./pages/ListPage";
import ViewPage from "./pages/ViewPage";
import EditorPage from "./pages/EditorPage";

// ✅ 테마 저장 키
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
  return prefersDark ? "dark" : "light";
}

export default function App() {
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
      {/* ✅ List */}
      <Route path="/" element={<ListPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* ✅ Article view */}
      <Route path="/article/:id" element={<ViewPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* ✅ Editor write (new) */}
      <Route path="/write" element={<EditorPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* ✅ Editor write (edit existing)  <-- 이게 없으면 Edit 눌렀을 때 리스트로 떨어져요 */}
      <Route path="/write/:id" element={<EditorPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* (선택) saved 페이지를 따로 쓰고 있다면 */}
      <Route path="/saved" element={<ListPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* ✅ 그 외는 홈으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
