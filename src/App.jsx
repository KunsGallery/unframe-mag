import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ListPage from "./pages/ListPage.jsx";
import ViewPage from "./pages/ViewPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";

export default function App() {
  const [theme, setTheme] = useState(() => {
    const t = localStorage.getItem("UF_THEME");
    return t === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("UF_THEME", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((p) => (p === "dark" ? "light" : "dark"));
  }

  return (
    <Routes>
      <Route path="/" element={<ListPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/article/:id" element={<ViewPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/write" element={<EditorPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/write/:id" element={<EditorPage theme={theme} toggleTheme={toggleTheme} />} />

      {/* 네가 saved 페이지 안 만든다고 했으니 홈으로 */}
      <Route path="/saved" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
