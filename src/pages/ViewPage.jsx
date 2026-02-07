// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { go } from "../utils/router";

import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";
import CommentBox from "../components/CommentBox"; // 기존에 있으면 유지, 없으면 네 프로젝트에 맞게 조정

const MAX_WIDTH = 1200;

function formatDate(ts) {
  try {
    if (!ts) return "";
    const d =
      typeof ts?.toDate === "function"
        ? ts.toDate()
        : typeof ts === "number"
        ? new Date(ts)
        : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "";
  }
}

export default function ViewPage({ id, theme, toggleTheme }) {
  const idNum = id ? Number(id) : null;

  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Saved 상태 (로컬)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = useMemo(() => savedIds.includes(Number(a?.id)), [savedIds, a?.id]);

  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  // ✅ 글 로드 + 조회수 bump
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!idNum) return;

        const article = await getArticleByIdNumber(idNum);
        if (!alive) return;

        if (!article) {
          setA(null);
          return;
        }

        setA(article);

        // ✅ 조회수는 서비스쪽에서 30분 쿨다운 적용되어 있어야 함
        try {
          await bumpViews(idNum);
        } catch (e) {
          // 조회수 실패는 UX에 치명적이지 않아서 조용히
          console.warn("bumpViews failed:", e);
        }
      } catch (e) {
        console.error(e);
        setA(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [idNum]);

  async function onLike() {
    if (!a?.id) return;
    try {
      // ✅ likes는 서비스에서 3시간 쿨다운 적용되어 있어야 함
      const next = await bumpLikes(Number(a.id));
      // bumpLikes가 업데이트된 likes를 반환하면 반영
      if (typeof next?.likes === "number") {
        setA((p) => ({ ...p, likes: next.likes }));
      } else {
        // 반환이 없다면, 화면만 낙관적 업데이트(선택)
        setA((p) => ({ ...p, likes: Number(p?.likes || 0) + 1 }));
      }
    } catch (e) {
      // 서비스에서 쿨다운 걸릴 때 throw 한다면 여기서 안내 가능
      console.warn(e);
      alert("이 글을 향한 애정은 3시간 뒤에 다시 보내주세요 💛");
    }
  }

  function onToggleSave() {
    if (!a?.id) return;
    const r = toggleSaved(Number(a.id));
    setSavedIds(r.ids);
    alert(saved ? "저장 해제했어요 🧹 (기기 변경 시 저장도 사라져요)" : "저장했어요 ★ (기기 변경 시 저장도 사라져요)");
  }

  if (loading) {
    return (
      <div style={{ padding: 80, maxWidth: MAX_WIDTH, margin: "0 auto" }}>
        로딩 중… ⏳
      </div>
    );
  }

  if (!a) {
    return (
      <div style={{ padding: 80, maxWidth: MAX_WIDTH, margin: "0 auto" }}>
        글을 찾지 못했어요 🥲{" "}
        <button onClick={() => go("?mode=list")} style={{ textDecoration: "underline" }}>
          리스트로
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ✅ Top Nav */}
      <div className="u-topNav">
        <div className="u-topNav__inner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-brand" onClick={() => go("?mode=list")}>
            U#
          </div>

          <div className="u-navRight">
            <button className="u-navLinkBtn" onClick={() => go("?mode=list#archive")}>
              Archive
            </button>

            <button className="u-navLinkBtn u-navLinkBtn--saved" onClick={() => go("?mode=list#archive&saved=1")}>
              Saved ({savedIds.length})
            </button>

            <button className="u-navLinkBtn" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ 본문 영역 */}
      <div style={{ maxWidth: MAX_WIDTH, margin: "0 auto", padding: "24px 16px" }}>
        {/* ✅ 종이 카드: 다크모드에서도 글자/버튼이 검정으로 유지되게 .u-paper로 감싼다 */}
        <div className="u-paper" style={{ padding: "26px 26px" }}>
          {/* 메타 */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,.12)",
                fontSize: 12,
                background: "rgba(255,255,255,.6)",
              }}
            >
              {a.category || "Category"}
            </span>
            <span className="u-muted" style={{ fontSize: 12 }}>
              {formatDate(a.createdAt)}
            </span>
          </div>

          {/* 타이틀 */}
          <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: "6px 0 8px" }}>{a.title}</h1>
          {a.excerpt ? (
            <p className="u-muted" style={{ marginBottom: 14 }}>
              {a.excerpt}
            </p>
          ) : null}

          {/* 액션 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <button className="u-paperBtn u-paperBtn--primary" onClick={onLike}>
              💗 Like
            </button>
            <button className="u-paperBtn" onClick={onToggleSave}>
              {saved ? "★ Saved" : "☆ Save"}
            </button>

            {/* ✅ Edit: 에디터는 관리자만 접근 가능(에디터에서 로그인 가드 처리) */}
            <button className="u-paperBtn" onClick={() => go(`?mode=editor&id=${a.id}`)}>
              ✏️ Edit
            </button>

            <div className="u-muted" style={{ fontSize: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span>👁 {Number(a.views || 0)}</span>
              <span>💗 {Number(a.likes || 0)}</span>
            </div>
          </div>

          {/* 커버 */}
          {(a.coverMedium || a.coverThumb || a.cover) && (
            <img
              src={a.coverMedium || a.coverThumb || a.cover}
              alt="cover"
              style={{
                width: "100%",
                borderRadius: 18,
                border: "1px solid rgba(0,0,0,.10)",
                marginBottom: 18,
              }}
            />
          )}

          {/* 본문 HTML */}
          <div
            className="u-articleBody"
            dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }}
          />

          {/* 댓글 */}
          <div style={{ marginTop: 30 }}>
            <CommentBox articleId={a.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
