// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CommentBox from "../components/CommentBox";
import { toggleSaved, getSavedIds } from "../services/bookmarks";
import { getPublishedArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";

const TYPO_KEY = "UF_TYPO_V1";
const TYPO_DEFAULT = { font: "serif", size: 17, prose: 760, lh: 1.95 };

function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? { ...fallback, ...obj } : fallback;
  } catch {
    return fallback;
  }
}
function applyTypoToRoot(t) {
  const root = document.documentElement;
  const fontVar = t.font === "sans" ? "var(--sans)" : "var(--serif)";
  root.style.setProperty("--uf-font", fontVar);
  root.style.setProperty("--uf-fontSize", `${Number(t.size || 17)}px`);
  root.style.setProperty("--uf-prose", `${Number(t.prose || 760)}px`);
  root.style.setProperty("--uf-lineHeight", String(t.lh || 1.95));
}

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
  return Math.max(1, Math.min(99, Math.ceil(words / 220)));
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

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-가-힣]/g, "");
}

function buildTocAndAnchors(rootEl) {
  if (!rootEl) return [];
  const headings = Array.from(rootEl.querySelectorAll("h2, h3"));
  let idx = 0;
  const toc = headings.map((h) => {
    idx += 1;
    const title = h.textContent?.trim() || "untitled";
    const id = `h-${idx}-${slugify(title)}`;
    h.id = id;
    return { id, level: h.tagName === "H3" ? 3 : 2, title };
  });
  return toc;
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

  const bodyRef = useRef(null);
  const heroBgRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const [toc, setToc] = useState([]);

  // Lightbox (이미 구현되어 있으면 유지)
  const [lightbox, setLightbox] = useState(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = safeGetJSON(TYPO_KEY, TYPO_DEFAULT);
    applyTypoToRoot(t);
  }, []);

  const cover = article?.coverMedium || article?.coverThumb || article?.cover || "";
  const readingMin = useMemo(() => calcReadingMin(article?.contentHTML || ""), [article?.contentHTML]);

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
        } catch {}
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

  // Build TOC + image zoom click
  useEffect(() => {
    if (!article) return;
    const root = bodyRef.current;
    if (!root) return;

    // TOC + anchor ids
    const nextToc = buildTocAndAnchors(root);
    setToc(nextToc);

    const onClick = (e) => {
      const img = e.target?.closest?.("img");
      if (!img) return;
      setLightbox({ src: img.currentSrc || img.src, alt: img.alt || "" });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [article?.contentHTML]);

  // progress + hero bg
  useEffect(() => {
    if (!article) return;
    const root = bodyRef.current;
    if (!root) return;

    let raf = 0;
    const tick = () => {
      raf = 0;

      if (heroBgRef.current) {
        const y = window.scrollY || 0;
        heroBgRef.current.style.transform = `translateY(${Math.min(90, y * 0.12)}px) scale(1.04)`;
      }

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

  function goAnchor(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      {lightbox?.src ? (
        <div className="uf-lightbox" onClick={() => setLightbox(null)} role="presentation">
          <div className="uf-lightbox__inner" onClick={(e) => e.stopPropagation()} role="presentation">
            <img src={lightbox.src} alt={lightbox.alt || "image"} />
          </div>
        </div>
      ) : null}

      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner" style={{ position: "relative" }}>
            <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn" onClick={toggleTheme}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
            </div>

            <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 3, background: "color-mix(in srgb, var(--line) 30%, transparent)", overflow: "hidden", borderRadius: 999 }}>
              <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: "var(--brand)" }} />
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
                  <div
                    ref={bodyRef}
                    className="ProseMirror uf-prose"
                    dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                  />

                  <div style={{ marginTop: 28 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                <aside className="uf-side">
                  <div className="uf-card uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>
                    <div className="uf-sideInfo">좋아요 3시간 쿨다운 · 저장은 로컬</div>

                    <div className="uf-sideBtns" style={{ marginBottom: 14 }}>
                      <button className="uf-btn uf-btn--primary" onClick={onLike}>💗 Like</button>
                      <button className="uf-btn" onClick={onToggleSave}>{saved ? "★ Saved" : "☆ Save"}</button>
                      <button className="uf-btn uf-btn--ghost" onClick={() => nav(`/write/${idNum}`)}>✍️ Edit</button>
                      <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>← Back to list</button>
                    </div>

                    {toc.length > 0 && (
                      <div className="uf-toc">
                        <div className="uf-sideTitle" style={{ marginTop: 6 }}>TOC</div>
                        <div className="uf-tocList">
                          {toc.map((t) => (
                            <button
                              key={t.id}
                              className={`uf-tocItem ${t.level === 3 ? "is-h3" : ""}`}
                              onClick={() => goAnchor(t.id)}
                            >
                              {t.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
