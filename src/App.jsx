import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ListPage from "./pages/ListPage.jsx";
import ViewPage from "./pages/ViewPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("UF_THEME") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("UF_THEME", theme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<ListPage theme={theme} toggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")} />} />
      <Route path="/article/:id" element={<ViewPage theme={theme} toggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")} />} />
      <Route path="/write" element={<EditorPage theme={theme} toggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")} />} />
      <Route path="/write/:id" element={<EditorPage theme={theme} toggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")} />} />
      <Route path="/saved" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
