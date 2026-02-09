// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { bumpLikes, bumpViews, getPublishedArticleByIdNumber } from "../services/articles";
import { toggleSaved, getSavedIds } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

/* =============================================================================
  ✅ util
============================================================================= */
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
  const byWords = Math.ceil(words / 220);
  const byChars = Math.ceil(chars / 900);
  return Math.max(1, Math.min(99, Math.max(byWords, byChars)));
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

/* =============================================================================
  ✅ 핵심: contentHTML을 Scene으로 분해
  - 에디터에서 “Divider(=hr)”를 넣으면 장면이 끊기는 구조
============================================================================= */
function splitByHr(html) {
  const safe = String(html || "");
  // hr 태그 형태가 조금 달라도 대응
  const parts = safe.split(/<hr\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [safe];
}

/* =============================================================================
  ✅ Sticky Scene 규칙
  - Scene 내부에 “[sticky]”라는 텍스트가 있으면 Sticky Story로 처리
  - (에디터에서 그냥 텍스트로 한 줄 써도 됨)
============================================================================= */
function extractSticky(sceneHtml) {
  let html = String(sceneHtml || "");

  const hasStickyMarker = html.toLowerCase().includes("[sticky]");
  if (!hasStickyMarker) return { type: "normal", html };

  // marker 제거
  html = html.replace(/\[sticky\]/gi, "");

  // 첫 번째 <img ...>를 media로, 나머지를 text로
  const imgMatch = html.match(/<img\b[^>]*>/i);
  if (!imgMatch) {
    // 이미지가 없으면 그냥 normal로
    return { type: "normal", html };
  }

  const imgTag = imgMatch[0];
  const afterRemoveFirstImg = html.replace(imgTag, "");

  return {
    type: "sticky",
    mediaHTML: imgTag,
    textHTML: afterRemoveFirstImg,
  };
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

  // parallax refs
  const heroBgRef = useRef(null);
  const rafRef = useRef(null);

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

        // ✅ 조회수 +1 (쿨다운은 services)
        try {
          await bumpViews(idNum);
        } catch (e) {
          console.warn("bumpViews:", e?.message || e);
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
    ✅ Reveal: Scene 단위로 들어오면 is-in 붙이기
  ============================================================================= */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".uf-reveal"));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("is-in");
        }
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [article?.contentHTML]);

  /* =============================================================================
    ✅ Parallax: (가벼운) 스크롤 기반 transform
    - 1) Hero bg
    - 2) 본문 내 img는 uf-parallax 클래스를 달아주면 같이 움직임
  ============================================================================= */
  useEffect(() => {
    function onScroll() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        const y = window.scrollY || 0;

        // Hero bg parallax
        const hero = heroBgRef.current;
        if (hero) {
          // 상단에서는 더 많이, 내려가면 약해지게
          const t = Math.min(120, y * 0.18);
          hero.style.transform = `translateY(${t}px) scale(1.05)`;
        }

        // content images parallax (부담 없는 정도)
        const imgs = Array.from(document.querySelectorAll(".uf-parallax"));
        for (const img of imgs) {
          const rect = img.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const vh = window.innerHeight || 800;
          const p = (center - vh / 2) / (vh / 2); // -1~1 근사
          const amt = Math.max(-1, Math.min(1, p)) * 14; // px
          img.style.transform = `translateY(${amt}px)`;
        }
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [article?.contentHTML]);

  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("좋아해주셔서 감사해요💕");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("cooldown")) show("⏳ 이 글을 향한 애정은 3시간 뒤에 다시 보내주세요");
      else show("😵 좋아요 처리에 실패했어요");
    }
  }

  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요! (기기별 저장)" : "☆ 저장을 해제했어요");
  }

  const cover = article?.coverMedium || article?.coverThumb || article?.cover || "";
  const readMin = calcReadingMin(article?.contentHTML);

  // ✅ Scene 분해 결과
  const scenes = useMemo(() => {
    const parts = splitByHr(article?.contentHTML);
    return parts.map((p) => extractSticky(p));
  }, [article?.contentHTML]);

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn" type="button" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="uf-wrap" style={{ padding: "80px 16px", color: "var(--muted)" }}>
          로딩 중… ⏳
        </div>
      ) : !article ? (
        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>😮 글을 찾지 못했어요</div>
            <div style={{ color: "var(--muted)", marginBottom: 14 }}>
              주소가 잘못됐거나 삭제된 글일 수 있어요.
            </div>
            <button className="uf-btn uf-btn--primary" type="button" onClick={() => nav("/")}>
              리스트로 돌아가기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Hero */}
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
                <div className="uf-viewHero__title">{article.title || "(no title)"}</div>

                <div className="uf-viewHero__meta">
                  <span>🗓 {formatDate(article.createdAt)}</span>
                  <span>☕ {readMin} min</span>
                  <span>👁 {Number(article.views || 0)}</span>
                  <span>💗 {Number(article.likes || 0)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Body */}
          <section className="uf-viewBody">
            <div className="uf-wrap">
              <div className="uf-viewGrid">
                <main className="uf-card uf-article">
                  {article.excerpt ? (
                    <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                      {article.excerpt}
                    </div>
                  ) : null}

                  {/* ✅ Scene 단위 렌더링 + reveal */}
                  {scenes.map((s, idx) => {
                    // Scene wrapper에 uf-reveal을 달아서 “장면 단위로 들어올 때” 애니메이션
                    if (s.type === "sticky") {
                      return (
                        <div key={idx} className="uf-scene uf-reveal">
                          <div className="uf-stickyStory">
                            <div className="uf-stickyMedia">
                              {/* 첫 이미지: parallax 되게 uf-parallax class 추가 */}
                              <div
                                className="uf-parallax"
                                dangerouslySetInnerHTML={{ __html: s.mediaHTML || "" }}
                              />
                            </div>
                            <div className="uf-stickyText">
                              <div
                                dangerouslySetInnerHTML={{ __html: s.textHTML || "" }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // normal scene
                    return (
                      <div key={idx} className="uf-scene uf-reveal">
                        {/* 본문 이미지들에 parallax를 자동 적용하려고, 렌더 후에 class를 붙이기 어려움
                            → 그래서 간단히: img 태그에 style/class를 추가하긴 어렵지만,
                            여기서는 “scene 전체 reveal”이 기본이고,
                            parallax는 Sticky 이미지/hero 중심으로 먼저 깔았어.
                            (원하면 다음 단계에서 DOMParser로 img에 class 자동 부여도 가능) */}
                        <div dangerouslySetInnerHTML={{ __html: s.html || "" }} />
                      </div>
                    );
                  })}

                  {/* 댓글 */}
                  <div style={{ marginTop: 26 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                {/* Quick actions */}
                <aside className="uf-side">
                  <div className="uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>
                    <div className="uf-sideInfo">
                      ✨ 좋아요는 3시간 쿨다운, 조회수는 30분 쿨다운이에요.
                      <br />
                      * Saved는 로컬 저장이라 기기마다 달라질 수 있어요.
                    </div>

                    <div className="uf-sideBtns">
                      <button className="uf-btn uf-btn--primary" type="button" onClick={onLike}>
                        💗 Like
                      </button>

                      <button className="uf-btn" type="button" onClick={onToggleSave}>
                        {saved ? "★ Saved" : "☆ Save"}
                      </button>

                      <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav(`/write/${idNum}`)}>
                        ✍️ Edit
                      </button>

                      <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav("/")}>
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
