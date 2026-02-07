// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";

import ListPage from "./pages/ListPage";
import ViewPage from "./pages/ViewPage";
import EditorPage from "./pages/EditorPage";

// ✅ getParam은 그대로 사용하되,
// ✅ URL 변경을 React가 감지하도록 subscribe/getLocationKey를 추가로 사용
import { getParam, subscribe, getLocationKey } from "./utils/router";

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

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // ✅ "글 안보임" 같은 사고 방지하려면 기본은 light가 더 안전
  return prefersDark ? "dark" : "light";
}

export default function App() {
  /**
   * ✅ 핵심 상태: locKey
   * - URL이 바뀔 때마다 locKey가 바뀌게 만들어서
   *   React가 "URL 변경"을 리렌더 트리거로 인식하게 함
   *
   * - locKey 값 자체를 화면에 쓰지 않아도 괜찮고,
   *   "리렌더 트리거" 역할만 하면 됨
   */
  const [locKey, setLocKey] = useState(() => getLocationKey());

  /**
   * ✅ router 구독
   * - go() / replace() / 뒤로가기(popstate) 등으로 URL이 바뀌면 notify()가 호출되고,
   *   여기서 locKey가 바뀌면서 App이 즉시 리렌더됨
   */
  useEffect(() => {
    return subscribe(setLocKey);
  }, []);

  /**
   * ✅ URL이 바뀔 때마다 mode/id를 다시 읽어야 하므로
   * - locKey를 dependency로 둬서 URL 변화에 따라 재계산되게 함
   */
  const { mode, id } = useMemo(() => {
    return {
      mode: getParam("mode") || "list",
      id: getParam("id"), // view/editor에서 사용
    };
  }, [locKey]);

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
  //    페이지별 TopNav UX 통일 가능
  if (mode === "view") return <ViewPage id={id} theme={theme} toggleTheme={toggleTheme} />;
  if (mode === "editor") return <EditorPage id={id} theme={theme} toggleTheme={toggleTheme} />;
  return <ListPage theme={theme} toggleTheme={toggleTheme} />;
}
