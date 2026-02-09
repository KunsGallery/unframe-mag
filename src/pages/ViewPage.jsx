// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  bumpLikes,
  bumpViews,
  getPublishedArticleByIdNumber,
} from "../services/articles";

import { toggleSaved, getSavedIds } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

/* =============================================================================
  ✅ 날짜 포맷(타임스탬프/숫자/문자열 대응)
============================================================================= */
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
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

/* =============================================================================
  ✅ 토스트(친근한 UX)
============================================================================= */
function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show: (msg) => setToast(msg) };
}

export default function ViewPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /article/:id
  const idNum = useMemo(() => Number(id), [id]);

  const { toast, show } = useToast();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  // ✅ Saved(북마크)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = savedIds.includes(idNum);

  // ✅ 좋아요 연타 방지(버튼 잠깐 disable)
  const [liking, setLiking] = useState(false);

  /* =============================================================================
    ✅ 글 로드 + 조회수 1회 증가
  ============================================================================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const a = await getPublishedArticleByIdNumber(idNum);
        if (!alive) return;

        if (!a) {
          setArticle(null);
          show("😮 글을 찾을 수 없어요.");
          return;
        }

        setArticle(a);

        // ✅ 조회수 bump는 실패해도 UX 치명적이지 않아서 조용히 처리
        try {
          await bumpViews(idNum);
        } catch (e) {
          console.warn("bumpViews failed:", e?.message || e);
        }
      } catch (e) {
        console.error(e);
        setArticle(null);
        show("😵 글을 불러오지 못했어요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [idNum]);

  /* =============================================================================
    ✅ 좋아요(3시간 쿨다운)
  ============================================================================= */
  async function onLike() {
    if (liking) return; // ✅ 연타 방지
    setLiking(true);

    try {
      const nextLikes = await bumpLikes(idNum);

      // ✅ UI 즉시 반영(낙관적)
      setArticle((p) => (p ? { ...p, likes: nextLikes } : p));

      show("좋아해주셔서 감사해요💕");
    } catch (e) {
      const code = e?.code || "";
      const msg = String(e?.message || "");

      if (code === "COOLDOWN" || msg.includes("cooldown")) {
        show("⏳ 이 글을 향한 애정은 3시간 뒤에 다시 보내주세요");
      } else if (msg.includes("Article not found")) {
        show("😮 글을 찾지 못했어요");
      } else {
        show("😵 좋아요 처리에 실패했어요");
      }
    } finally {
      setLiking(false);
    }
  }

  /* =============================================================================
    ✅ 저장(북마크)
  ============================================================================= */
  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요! (기기별로 저장돼요)" : "☆ 저장을 해제했어요");
  }

  const cover =
    article?.coverMedium || article?.coverThumb || article?.cover || "";

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      {/* ✅ Topbar */}
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <div className="uf-brand" onClick={() => nav("/")}>U#</div>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>
                Archive
              </button>
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/saved")}>
                Saved
              </button>

              <button className="uf-btn" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Loading / Not Found */}
      {loading ? (
        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          로딩 중… ⏳
        </div>
      ) : !article ? (
        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card uf-panel">
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
              😮 글을 찾지 못했어요
            </div>
            <div style={{ color: "var(--muted)", marginBottom: 14 }}>
              주소가 잘못됐거나 삭제된 글일 수 있어요.
            </div>
            <button className="uf-btn uf-btn--primary" onClick={() => nav("/")}>
              리스트로 돌아가기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ✅ Hero */}
          <section className="uf-hero">
            <div
              className="uf-hero__bg"
              style={{
                backgroundImage: cover
                  ? `url(${cover})`
                  : "linear-gradient(135deg, rgba(37,99,235,.55), rgba(0,0,0,.15))",
              }}
            />
            <div className="uf-hero__overlay" />
            <div className="uf-wrap">
              <div className="uf-hero__content">
                <div className="uf-hero__kicker">{article.category || "UNFRAME"}</div>
                <h1 className="uf-hero__title">{article.title || "(no title)"}</h1>

                <div className="uf-hero__meta">
                  <span>🗓 {formatDate(article.createdAt)}</span>
                  <span>👁 {Number(article.views || 0)}</span>
                  <span>💗 {Number(article.likes || 0)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ✅ Body */}
          <section className="uf-viewBody">
            <div className="uf-wrap">
              <div className="uf-viewGrid">
                {/* Main */}
                <main className="uf-card uf-article">
                  {article.excerpt ? (
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: 14,
                        lineHeight: 1.6,
                        marginBottom: 14,
                      }}
                    >
                      {article.excerpt}
                    </div>
                  ) : null}

                  <div
                    className="ProseMirror"
                    dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                  />

                  <div style={{ marginTop: 26 }}>
                    {/* ✅ 댓글은 articleId 기반으로 */}
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                {/* Side */}
                <aside className="uf-side">
                  <div className="uf-card uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>

                    <div className="uf-sideInfo">
                      ✨ 좋아요/조회수는 “글별 쿨다운”으로 정확도를 높여요.
                      <br />
                      ★ Saved는 로컬 저장이라 기기가 바뀌면 달라질 수 있어요.
                    </div>

                    <div className="uf-sideBtns">
                      <button
                        className="uf-btn uf-btn--primary"
                        onClick={onLike}
                        disabled={liking}
                        title="3시간 쿨다운"
                      >
                        💗 Like {liking ? "…" : ""}
                      </button>

                      <button className="uf-btn" onClick={onToggleSave}>
                        {saved ? "★ Saved" : "☆ Save"}
                      </button>

                      {/* ✅ Edit: /write/:id */}
                      <button
                        className="uf-btn uf-btn--ghost"
                        onClick={() => nav(`/write/${idNum}`)}
                      >
                        ✍️ Edit
                      </button>

                      <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>
                        ← Back to list
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
