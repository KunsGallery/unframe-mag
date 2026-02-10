import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bumpLikes, bumpViews, getPublishedArticleByIdNumber } from "../services/articles";
import { toggleSaved, getSavedIds } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

function formatDate(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "";
  }
}

function calcReadingMin(html) {
  const text = String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 1;
  const words = text.split(" ").filter(Boolean).length;
  const chars = text.length;
  return Math.max(1, Math.min(99, Math.max(Math.ceil(words / 220), Math.ceil(chars / 900))));
}

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
  const { id } = useParams();
  const idNum = useMemo(() => Number(id), [id]);
  const { toast, show } = useToast();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = savedIds.includes(idNum);

  const heroBgRef = useRef(null);

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

        try { await bumpViews(idNum); } catch {}
      } catch (e) {
        console.error(e);
        setArticle(null);
        show("😵 글을 불러오지 못했어요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [idNum]);

  // ✅ Reveal: 본문 요소들에 uf-reveal 부여 + is-in 토글
  useEffect(() => {
    if (!article) return;

    const root = document.querySelector(".uf-article .ProseMirror");
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll("p, h2, h3, blockquote, img, section[data-uf='scene'], div[data-uf='sticky']")
    );

    targets.forEach((el) => el.classList.add("uf-reveal"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("is-in");
        }
      },
      { threshold: 0.12 }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [article]);

  // ✅ Parallax: hero + uf-parallax
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY || 0;

      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translateY(${y * 0.18}px) scale(1.08)`;
      }

      document.querySelectorAll(".uf-parallax").forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const viewport = window.innerHeight / 2;
        const delta = (center - viewport) * 0.08; // 강도
        el.style.transform = `translateY(${delta}px)`;
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [article]);

  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("좋아해주셔서 감사해요💕");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("cooldown")) show("⏳ 3시간 뒤에 다시 눌러주세요");
      else show("😵 좋아요 실패");
    }
  }

  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요!" : "☆ 저장 해제!");
  }

  if (loading) {
    return <div className="uf-wrap" style={{ padding: "90px 16px" }}>로딩 중… ⏳</div>;
  }

  if (!article) {
    return (
      <div className="uf-wrap" style={{ padding: "90px 16px" }}>
        <div className="uf-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 950, fontSize: 20, marginBottom: 8 }}>😮 글을 찾지 못했어요</div>
          <button className="uf-btn uf-btn--primary" onClick={() => nav("/")}>리스트로</button>
        </div>
      </div>
    );
  }

  const cover = article.coverMedium || article.coverThumb || article.cover || "";
  const readMin = calcReadingMin(article.contentHTML);

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" onClick={() => nav("/")}>U#</button>
            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="uf-viewHero">
        <div
          ref={heroBgRef}
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

      <section className="uf-viewBody">
        <div className="uf-wrap">
          <div className="uf-viewGrid">
            <main className="uf-card uf-article">
              {article.excerpt ? (
                <div style={{ color: "var(--muted)", marginBottom: 16, lineHeight: 1.7 }}>
                  {article.excerpt}
                </div>
              ) : null}

              <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }} />

              <div style={{ marginTop: 30 }}>
                <CommentBox articleId={idNum} />
              </div>
            </main>

            <aside className="uf-side">
              <div className="uf-sideBox">
                <div className="uf-sideTitle">Quick Actions</div>
                <div className="uf-sideInfo">
                  좋아요 3시간 쿨다운 / 조회수 30분 쿨다운<br />
                  저장은 기기(local) 기준
                </div>

                <div className="uf-sideBtns">
                  <button className="uf-btn uf-btn--primary" onClick={onLike}>💗 Like</button>
                  <button className="uf-btn" onClick={onToggleSave}>{saved ? "★ Saved" : "☆ Save"}</button>
                  <button className="uf-btn uf-btn--ghost" onClick={() => nav(`/write/${idNum}`)}>✍️ Edit</button>
                  <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>← Back</button>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </section>
    </div>
  );
}
