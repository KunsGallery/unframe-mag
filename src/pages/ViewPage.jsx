// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CommentBox from "../components/CommentBox";
import { toggleSaved, getSavedIds } from "../services/bookmarks";
import { getPublishedArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";

/* =============================================================================
  util
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

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => setToast(msg), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show };
}

/* =============================================================================
  ✅ View용: 블록 표준화 + reveal 대상 표시
============================================================================= */
function hydrateBlocks(rootEl) {
  if (!rootEl) return;

  rootEl.querySelectorAll("[data-uf-node-ui]").forEach((el) => (el.style.display = "none"));

  // Sticky
  rootEl.querySelectorAll('section[data-uf="stickyStory"]').forEach((sec) => {
    const side = sec.getAttribute("data-side") || "left";
    sec.classList.add("uf-stickyView", `is-${side}`, "uf-reveal");

    const fig = sec.querySelector("figure");
    if (fig) fig.classList.add("uf-stickyFigure");
    const img = fig?.querySelector("img");
    if (img) img.classList.add("uf-stickyImg");

    // body 보정
    let body = sec.querySelector(".uf-stickyBody");
    if (!body) {
      body = document.createElement("div");
      body.className = "uf-stickyBody";
      const kids = Array.from(sec.children).filter((c) => c !== fig);
      kids.forEach((k) => body.appendChild(k));
      sec.appendChild(body);
    }
  });

  // Parallax
  rootEl.querySelectorAll('figure[data-uf="parallax"]').forEach((fig) => {
    fig.classList.add("uf-parallaxFigure", "uf-reveal");
    const img = fig.querySelector("img");
    if (img) img.classList.add("uf-parallaxImg");

    if (!fig.getAttribute("data-speed")) fig.setAttribute("data-speed", img?.getAttribute("data-speed") || "0.18");
  });

  // 기본 reveal
  rootEl.querySelectorAll("hr, blockquote, figure, h2, h3, p, ul, ol").forEach((el) => el.classList.add("uf-reveal"));
}

/* =============================================================================
  ✅ reveal: 화면에 있는 건 즉시 보이게(사라짐 방지)
============================================================================= */
function revealImmediatelyInViewport(rootEl) {
  if (!rootEl) return;
  const vh = window.innerHeight || 800;
  const els = Array.from(rootEl.querySelectorAll(".uf-reveal"));

  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    // 화면에 걸쳐있으면(혹은 조금 위/아래 여유) 즉시 표시
    if (r.bottom > -80 && r.top < vh + 120) el.classList.add("is-in");
  });
}

/* =============================================================================
  ViewPage
============================================================================= */
export default function ViewPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams();
  const idNum = useMemo(() => Number(id), [id]);

  const { toast, show } = useToast();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = savedIds.includes(idNum);

  const bodyRef = useRef(null);
  const heroBgRef = useRef(null);

  // progress
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  const cover = article?.coverMedium || article?.coverThumb || article?.cover || "";
  const readingMin = useMemo(() => calcReadingMin(article?.contentHTML || ""), [article?.contentHTML]);

  /* load */
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
  }, [idNum, show]);

  /* ✅ hydrate + reveal observer (사라짐 방지 포함) */
  useEffect(() => {
    if (!article) return;
    const root = bodyRef.current;
    if (!root) return;

    hydrateBlocks(root);

    // 1) 일단 현재 화면에 걸친 요소는 즉시 보이게(=저장 후 사라짐 방지)
    revealImmediatelyInViewport(root);

    // 2) 다음 프레임에서 한 번 더(레이아웃/이미지 로딩 반영)
    const raf = requestAnimationFrame(() => {
      revealImmediatelyInViewport(root);
    });

    // 3) IntersectionObserver로 스크롤 애니메이션 유지
    const els = Array.from(root.querySelectorAll(".uf-reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) ent.target.classList.add("is-in");
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => io.observe(el));

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [article?.contentHTML]);

  /* ✅ Parallax engine (강력 버전) */
  useEffect(() => {
    if (!article) return;
    const root = bodyRef.current;
    if (!root) return;

    let raf = 0;

    const tick = () => {
      raf = 0;

      // hero bg
      if (heroBgRef.current) {
        const y = window.scrollY || 0;
        heroBgRef.current.style.transform = `translate3d(0, ${Math.min(90, y * 0.12)}px, 0) scale(1.04)`;
      }

      // parallax figures
      const figs = Array.from(root.querySelectorAll(".uf-parallaxFigure"));
      if (figs.length) {
        const vh = window.innerHeight || 800;

        figs.forEach((fig) => {
          const img = fig.querySelector(".uf-parallaxImg") || fig.querySelector("img");
          if (!img) return;

          const rect = fig.getBoundingClientRect();
          const speed = Number(fig.getAttribute("data-speed") || 0.18);

          const center = rect.top + rect.height / 2;
          const t = (center - vh / 2) / (vh / 2); // -1..1

          const range = 140;
          const offset = Math.max(-range, Math.min(range, -t * range * speed * 2.2));

          img.style.transform = `translate3d(0, ${offset}px, 0) scale(1.12)`;
        });
      }

      // progress
      const scrollTop = window.scrollY || 0;
      const top = root.offsetTop;
      const height = root.scrollHeight;
      const max = Math.max(1, top + height - window.innerHeight);

      const p = Math.max(0, Math.min(1, scrollTop / max));
      const next = Math.round(p * 1000) / 1000;
      if (next !== progressRef.current) {
        progressRef.current = next;
        setProgress(next);
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [article]);

  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("좋아해주셔서 감사해요 💕");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("cooldown")) show("⏳ 3시간 뒤에 다시 눌러주세요");
      else show("😵 좋아요 처리 실패");
    }
  }

  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요!" : "☆ 저장 해제");
  }

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner" style={{ position: "relative" }}>
            <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn" onClick={toggleTheme}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
            </div>

            <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 3, background: "color-mix(in srgb, var(--line) 30%, transparent)", overflow: "hidden", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: "var(--brand)", transition: "width .08s linear" }} />
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="uf-wrap" style={{ padding: "80px 16px" }}>로딩 중… ⏳</div>
      ) : !article ? (
        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card uf-panel">
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>😮 글을 찾지 못했어요</div>
            <div style={{ color: "var(--muted)", marginBottom: 14 }}>주소가 잘못됐거나 삭제된 글일 수 있어요.</div>
            <button className="uf-btn uf-btn--primary" onClick={() => nav("/")}>리스트로 돌아가기</button>
          </div>
        </div>
      ) : (
        <>
          <section className="uf-viewHero">
            <div
              ref={heroBgRef}
              className="uf-viewHero__bg"
              style={{
                backgroundImage: cover ? `url(${cover})` : "linear-gradient(135deg, rgba(37,99,235,.55), rgba(0,0,0,.15))",
              }}
            />
            <div className="uf-viewHero__overlay" />

            <div className="uf-wrap">
              <div className="uf-viewHero__content">
                <div className="uf-viewHero__kicker">{article.category || "UNFRAME"}</div>
                <h1 className="uf-viewHero__title">{article.title || "(no title)"}</h1>

                <div className="uf-viewHero__meta">
                  <span>☕ {readingMin} min</span>
                  <span>🗓 {formatDate(article.createdAt)}</span>
                  <span>👁 {Number(article.views || 0)}</span>
                  <span>💗 {Number(article.likes || 0)}</span>
                </div>

                {article.excerpt ? (
                  <div style={{ marginTop: 10, maxWidth: 760, opacity: 0.92, lineHeight: 1.6 }}>
                    {article.excerpt}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="uf-viewBody">
            <div className="uf-wrap">
              <div className="uf-viewGrid">
                <main className="uf-card uf-article" style={{ minWidth: 0 }}>
                  <div ref={bodyRef} className="ProseMirror" dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }} />

                  <div style={{ marginTop: 28 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                <aside className="uf-side">
                  <div className="uf-card uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>
                    <div className="uf-sideInfo">좋아요 3시간 쿨다운 · 저장은 로컬</div>

                    <div className="uf-sideBtns">
                      <button className="uf-btn uf-btn--primary" onClick={onLike}>💗 Like</button>
                      <button className="uf-btn" onClick={onToggleSave}>{saved ? "★ Saved" : "☆ Save"}</button>
                      <button className="uf-btn uf-btn--ghost" onClick={() => nav(`/write/${idNum}`)}>✍️ Edit</button>
                      <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>← Back to list</button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 80, display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" onClick={onLike} title="Like" style={fabStyle}>💗</button>
              <button type="button" onClick={onToggleSave} title="Save" style={{ ...fabStyle, borderColor: saved ? "color-mix(in srgb, var(--brand) 55%, transparent)" : "var(--line)" }}>
                {saved ? "★" : "☆"}
              </button>
              <button type="button" onClick={toggleTheme} title="Theme" style={fabStyle}>{theme === "dark" ? "🌙" : "☀️"}</button>
              <button type="button" onClick={() => nav("/")} title="Back" style={fabStyle}>←</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const fabStyle = {
  width: 46,
  height: 46,
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--panel)",
  color: "var(--text)",
  cursor: "pointer",
  boxShadow: "var(--shadow)",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
  backdropFilter: "blur(10px)",
};
