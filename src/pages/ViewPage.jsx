// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  ✅ Reading time
  - HTML에서 텍스트만 뽑아서 대략 분(min) 계산
  - 한국어는 단어 기준이 애매해서 “문자 수” 기반으로도 근사치가 잘 나옴
  - 여기서는: 1분당 900자 정도로 가정 (원하면 숫자만 바꾸면 됨)
============================================================================= */
function estimateReadMinutesFromHTML(html) {
  const plain = String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const chars = plain.length;
  const charsPerMin = 900; // ✅ 취향대로 조절
  const mins = Math.max(1, Math.round(chars / charsPerMin));
  return { mins, chars };
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

  /* =============================================================================
    ✅ 글 불러오기 + 조회수 +1(서비스 내부 30분 쿨다운)
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

        // 조회수는 실패해도 UX는 유지
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
    ✅ 좋아요(서비스 내부 3시간 쿨다운)
  ============================================================================= */
  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      // ✅ UI 즉시 반영 (낙관적 업데이트)
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("좋아해주셔서 감사해요💕");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("cooldown") || e?.code === "COOLDOWN") {
        show("⏳ 이 글을 향한 애정은 3시간 뒤에 다시 보내주세요");
      } else {
        show("😵 좋아요 처리에 실패했어요");
      }
    }
  }

  /* =============================================================================
    ✅ Saved(북마크)
  ============================================================================= */
  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요! (기기별로 저장돼요)" : "☆ 저장을 해제했어요");
  }

  /* =============================================================================
    ✅ Scrollytelling: Reveal + Parallax
    - uf-reveal: IntersectionObserver로 is-visible 토글
    - uf-parallax: scroll에 따라 translateY 적용
============================================================================= */
  useEffect(() => {
    // 글이 없으면 효과도 불필요
    if (!article?.contentHTML) return;

    // (1) Reveal
    const reveals = Array.from(document.querySelectorAll(".uf-reveal"));
    let io = null;
    if (reveals.length) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) e.target.classList.add("is-visible");
          }
        },
        { threshold: 0.12 }
      );
      reveals.forEach((el) => io.observe(el));
    }

    // (2) Parallax
    const pxEls = Array.from(document.querySelectorAll(".uf-parallax[data-parallax]"));
    function onScroll() {
      const y = window.scrollY || 0;
      pxEls.forEach((el) => {
        const factor = Number(el.getAttribute("data-parallax") || 0.2);
        // ✅ 너무 과하면 어지러우니 0.15~0.35 추천
        el.style.transform = `translateY(${y * factor * -0.08}px)`;
      });
    }
    if (pxEls.length) {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      if (io) io.disconnect();
      if (pxEls.length) window.removeEventListener("scroll", onScroll);
    };
  }, [article?.contentHTML]);

  const cover = article?.coverMedium || article?.coverThumb || article?.cover || "";

  const read = useMemo(() => {
    return estimateReadMinutesFromHTML(article?.contentHTML || "");
  }, [article?.contentHTML]);

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      {/* ✅ Topbar */}
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

      {/* Loading / Not Found */}
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
          {/* Hero */}
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
                  <span>☕ {read.mins} min read</span>
                </div>
              </div>
            </div>
          </section>

          {/* Body */}
          <section className="uf-viewBody">
            <div className="uf-wrap">
              <div className="uf-viewGrid">
                {/* Main */}
                <main className="uf-card uf-article">
                  {article.excerpt ? (
                    <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                      {article.excerpt}
                    </div>
                  ) : null}

                  {/* 본문 HTML */}
                  <div
                    className="ProseMirror"
                    dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                  />

                  {/* comments */}
                  <div style={{ marginTop: 26 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                {/* Side */}
                <aside className="uf-side">
                  <div className="uf-card uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>
                    <div className="uf-sideInfo">
                      ✨ 좋아요/조회수는 “쿨다운”이 있어요.<br />
                      ★ Saved는 로컬 저장이라 기기가 바뀌면 달라질 수 있어요.
                    </div>

                    <div className="uf-sideBtns">
                      <button className="uf-btn uf-btn--primary" onClick={onLike}>
                        💗 Like
                      </button>

                      <button className="uf-btn" onClick={onToggleSave}>
                        {saved ? "★ Saved" : "☆ Save"}
                      </button>

                      {/* ✅ Edit: 누구나 보여도 OK (EditorPage에서 관리자 가드로 막힘) */}
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
