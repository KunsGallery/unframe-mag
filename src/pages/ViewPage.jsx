// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { bumpLikes, bumpViews, getArticleByIdNumber } from "../services/articles";
import { toggleSaved, getSavedIds } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

/* =============================================================================
  ✅ 날짜 포맷 (Firestore Timestamp / number / string 모두 대응)
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
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "";
  }
}

/* =============================================================================
  ✅ Toast (페이지 내 간단 안내)
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

  // ✅ Saved(북마크) 로컬 상태
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = savedIds.includes(idNum);

  /* =============================================================================
    ✅ 글 불러오기 + 조회수 1회 증가(쿨다운은 services에서 처리한다고 가정)
  ============================================================================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const a = await getArticleByIdNumber(idNum);
        if (!alive) return;

        if (!a) {
          setArticle(null);
          show("😮 글을 찾을 수 없어요.");
          return;
        }

        setArticle(a);

        // ✅ View 진입 시 조회수 +1 (중복 방지는 bumpViews 내부 로직 기준)
        try {
          await bumpViews(idNum);
        } catch (e) {
          // 조회수 실패는 UX에 치명적이지 않아서 조용히
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
    ✅ 좋아요
    - bumpLikes 내부에서 3시간 쿨다운/중복방지 처리한다고 가정
  ============================================================================= */
  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      // UI가 즉시 반영되게 article 상태도 같이 업데이트
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("좋아해주셔서 감사해요💕");
    } catch (e) {
      // 쿨다운 등은 서비스에서 던지는 메시지를 쓰는 게 자연스러움
      const msg = String(e?.message || "");
      if (msg.includes("cooldown")) {
        show("⏳ 이 글을 향한 애정은 3시간 뒤에 다시 보내주세요");
      } else {
        show("😵 좋아요 처리에 실패했어요");
      }
    }
  }

  /* =============================================================================
    ✅ Saved(북마크) 로컬 토글
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

      {/* =============================================================================
        ✅ Topbar (스티키)
      ============================================================================= */}
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <div className="uf-brand" onClick={() => nav("/")}>U#</div>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/saved")}>Saved</button>

              <button className="uf-btn" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =============================================================================
        ✅ Loading / Not Found
      ============================================================================= */}
      {loading ? (
        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          로딩 중… ⏳
        </div>
      ) : !article ? (
        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card uf-panel">
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>😮 글을 찾지 못했어요</div>
            <div style={{ color: "var(--muted)", marginBottom: 14 }}>
              주소가 잘못됐거나 삭제된 글일 수 있어요.
            </div>
            <button className="uf-btn uf-btn--primary" onClick={() => nav("/")}>리스트로 돌아가기</button>
          </div>
        </div>
      ) : (
        <>
          {/* =============================================================================
            ✅ Hero (Cover)
            - cover 없으면 그라데이션 배경으로 대체
          ============================================================================= */}
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

          {/* =============================================================================
            ✅ Body grid: article + side meta
          ============================================================================= */}
          <section className="uf-viewBody">
            <div className="uf-wrap">
              <div className="uf-viewGrid">
                {/* ------------------ Main Article ------------------ */}
                <main className="uf-card uf-article">
                  {/* ✅ excerpt */}
                  {article.excerpt ? (
                    <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                      {article.excerpt}
                    </div>
                  ) : null}

                  {/* ✅ 본문 HTML */}
                  <div
                    className="ProseMirror"
                    dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                  />

                  {/* ✅ comments */}
                  <div style={{ marginTop: 26 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                {/* ------------------ Side Bar ------------------ */}
                <aside className="uf-side">
                  <div className="uf-card uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>
                    <div className="uf-sideInfo">
                      ✨ 좋아요/저장은 로컬/쿨다운 기준으로 동작해요.
                      <br />
                      * 기기가 바뀌면 저장 목록도 달라질 수 있어요.
                    </div>

                    <div className="uf-sideBtns">
                      <button className="uf-btn uf-btn--primary" onClick={onLike}>
                        💗 Like
                      </button>

                      <button className="uf-btn" onClick={onToggleSave}>
                        {saved ? "★ Saved" : "☆ Save"}
                      </button>

                      <button className="uf-btn uf-btn--ghost" onClick={() => nav(`/write/${idNum}`)}>
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
