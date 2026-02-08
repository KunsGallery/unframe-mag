// src/components/Topbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * ✅ Topbar (공용 상단바)
 *
 * - List / View / Editor 어디서든 같은 UI/UX 유지
 * - 버튼/링크 구성은 props로 조립 가능
 * - uf- 클래스만 사용 (네 index.css 테마 변수 구조와 호환)
 *
 * 사용 예시:
 * <Topbar
 *   brandTo="/"
 *   right={[
 *     { type:"link", label:"Archive", to:"/" },
 *     { type:"button", label:"Saved", onClick: () => ... },
 *     { type:"theme" }
 *   ]}
 * />
 */
export default function Topbar({
  // ✅ 브랜드 클릭 시 이동 경로 (기본 "/")
  brandTo = "/",

  // ✅ 브랜드 텍스트 (기본 "U#")
  brandLabel = "U#",

  // ✅ 오른쪽 메뉴 배열
  //    type: "link" | "button" | "external" | "theme" | "spacer"
  //    - link: {to}
  //    - button: {onClick}
  //    - external: {href}
  right = [],

  // ✅ 테마/토글 (type:"theme"일 때 사용)
  theme,
  toggleTheme,
}) {
  const nav = useNavigate();

  return (
    <header className="uf-topbar">
      <div className="uf-wrap">
        <div className="uf-topbar__inner">
          {/* ✅ 브랜드 (좌측) */}
          <button
            type="button"
            className="uf-brand"
            onClick={() => nav(brandTo)}
            style={{
              // 버튼 기본스타일 제거(시각적으로 텍스트처럼)
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            aria-label="Go Home"
            title="Home"
          >
            {brandLabel}
          </button>

          {/* ✅ 우측 메뉴 */}
          <div className="uf-nav">
            {right.map((item, idx) => {
              if (!item) return null;

              // ------------------------------
              // (1) 여백용
              // ------------------------------
              if (item.type === "spacer") {
                return <span key={idx} style={{ width: item.w ?? 6 }} />;
              }

              // ------------------------------
              // (2) 테마 토글 버튼
              // ------------------------------
              if (item.type === "theme") {
                return (
                  <button
                    key={idx}
                    type="button"
                    className="uf-btn"
                    onClick={toggleTheme}
                    title="Toggle theme"
                  >
                    {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </button>
                );
              }

              // ------------------------------
              // (3) 내부 링크 (React Router)
              // ------------------------------
              if (item.type === "link") {
                return (
                  <button
                    key={idx}
                    type="button"
                    className={item.className || "uf-btn uf-btn--ghost"}
                    onClick={() => nav(item.to)}
                    title={item.title || item.label}
                  >
                    {item.icon ? <span>{item.icon}</span> : null}
                    {item.label}
                  </button>
                );
              }

              // ------------------------------
              // (4) 외부 링크
              // ------------------------------
              if (item.type === "external") {
                return (
                  <a
                    key={idx}
                    className={item.className || "uf-btn uf-btn--ghost"}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    title={item.title || item.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {item.icon ? <span>{item.icon}</span> : null}
                    {item.label}
                  </a>
                );
              }

              // ------------------------------
              // (5) 일반 버튼
              // ------------------------------
              if (item.type === "button") {
                return (
                  <button
                    key={idx}
                    type="button"
                    className={item.className || "uf-btn uf-btn--ghost"}
                    onClick={item.onClick}
                    title={item.title || item.label}
                  >
                    {item.icon ? <span>{item.icon}</span> : null}
                    {item.label}
                  </button>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
