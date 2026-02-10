// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { bumpLikes, bumpViews, getPublishedArticleByIdNumber } from "../services/articles";
import { toggleSaved, getSavedIds } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

/* =============================================================================
  ✅ 날짜 포맷
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
  ✅ 읽기 시간(대략)
============================================================================= */
function calcReadingMin(html) {
  const text = String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 1;

  const words = text.split(" ").filter(Boolean).length;
  const chars = text.length;

  const byWords = Math.ceil(words / 220);
  const byChars = Math.ceil(chars / 900);
  return Math.max(1, Math.min(99, Math.max(byWords, byChars)));
}

/* =============================================================================
  ✅ Toast
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

  // ✅ Read progress
  const articleRef = useRef(null);
  const [progress, setProgress] = useState(0);

  /* =============================================================================
    ✅ 글 불러오기 + 조회수
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
    ✅ 읽기 progress bar
    - "본문 영역(articleRef)" 기준으로 0~100%
  ============================================================================= */
  useEffect(() => {
    let raf = 0;

    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = articleRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;

        // el의 시작점이 viewport 상단에 닿는 순간부터,
        // el의 끝이 viewport 하단을 지나갈 때까지를 0~1로 매핑
        const total = rect.height - vh;
        if (total <= 0) {
          setProgress(1);
          return;
        }

        // rect.top: viewport 기준으로 el의 top 위치
        const passed = Math.min(Math.max(-rect.top, 0), total);
        const p = passed / total;
        setProgress(Number.isFinite(p) ? p : 0);
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [article?.contentHTML]);

  /* =============================================================================
    ✅ Like / Save
  ============================================================================= */
  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("💗 좋아요!");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("cooldown")) show("⏳ 3시간 뒤에 다시 눌러주세요");
      else show("😵 좋아요 실패");
    }
  }

  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요" : "☆ 저장 해제");
  }

  const cover = article?.coverMedium || article?.coverThumb || article?.cover || "";
  const readMin = calcReadingMin(article?.contentHTML || "");

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      {/* ✅ 상단 읽기 progress bar */}
      <div className="uf-readProgress" aria-hidden="true">
        <div className="uf-readProgress__bar" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* ✅ Topbar */}
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" type="button" onClick={() => nav("/")}>
              U#
            </button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>
                Archive
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
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>😮 글을 찾지 못했어요</div>
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
          <section className="uf-viewHero">
            <div
              className="uf-viewHero__bg"
              style={{
                backgroundImage: cover
                  ? `url(${cover})`
                  : "linear-gradient(135deg, rgba(37,99,235,.55), rgba(0,0,0,.15))",
              }}
            />
            <div className="uf-viewHero__overlay" />
            <div className="uf-wrap">
              <div className="uf-viewHero__content">
                <div className="uf-viewHero__kicker">{article.category || "UNFRAME"}</div>
                <h1 className="uf-viewHero__title">{article.title || "(no title)"}</h1>

                <div className="uf-viewHero__meta">
                  <span>☕ {readMin} min</span>
                  <span>🗓 {formatDate(article.createdAt)}</span>
                  <span>👁 {Number(article.views || 0)}</span>
                  <span>💗 {Number(article.likes || 0)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ✅ Body: 중앙 정렬 */}
          <section className="uf-viewBody">
            <div className="uf-wrap">
              <main className="uf-viewCenter" ref={articleRef}>
                <div className="uf-card uf-article">
                  {article.excerpt ? (
                    <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                      {article.excerpt}
                    </div>
                  ) : null}

                  <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }} />

                  <div style={{ marginTop: 26 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </div>
              </main>
            </div>
          </section>

          {/* ✅ Floating / Sticky Actions (원형 아이콘) */}
          <div className="uf-fab" aria-label="Quick actions">
            <button className="uf-fabBtn is-primary" onClick={onLike} title="Like">
              💗
            </button>

            <button className={`uf-fabBtn ${saved ? "is-on" : ""}`} onClick={onToggleSave} title="Save">
              {saved ? "★" : "☆"}
            </button>

            <button className="uf-fabBtn" onClick={() => nav(`/write/${idNum}`)} title="Edit (admin)">
              ✍️
            </button>

            <button className="uf-fabBtn" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "🌙" : "☀️"}
            </button>

            <button className="uf-fabBtn" onClick={() => nav("/")} title="Back to list">
              ←
            </button>
          </div>
        </>
      )}
    </div>
  );
}
