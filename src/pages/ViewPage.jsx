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

/* =============================================================================
  ✅ Reveal + Parallax enhancer
  - contentHTML이 렌더된 뒤 DOM을 잡아 IntersectionObserver로 reveal 처리
  - sticky 섹션은 CSS가 담당(아래 index.css 참고)
  - parallax는 requestAnimationFrame로 아주 약하게만 적용
============================================================================= */
function useSceneEffects(deps = []) {
  useEffect(() => {
    // -------------------------------------------------------------
    // 1) Reveal: 관찰할 타겟을 찾고 uf-reveal 클래스를 부여
    // -------------------------------------------------------------
    const root = document.querySelector(".uf-articleBody");
    if (!root) return;

    const scenes = Array.from(root.querySelectorAll("section[data-uf-scene]"));

    // scene 내부에서 "리빌" 할 요소들(과하면 부담, 미디엄 느낌은 절제)
    const revealTargets = [];
    for (const sc of scenes) {
      const els = Array.from(
        sc.querySelectorAll("h1,h2,h3,p,blockquote,figure,ul,ol,table")
      );
      els.forEach((el) => {
        el.classList.add("uf-reveal");
        revealTargets.push(el);
      });
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) ent.target.classList.add("is-visible");
        }
      },
      { root: null, threshold: 0.12 }
    );

    revealTargets.forEach((el) => io.observe(el));

    // -------------------------------------------------------------
    // 2) Parallax: sticky scene 안의 첫 이미지(또는 figure)만 아주 약하게 이동
    // -------------------------------------------------------------
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const stickyScenes = Array.from(
          root.querySelectorAll('section[data-uf-scene][data-variant="sticky"]')
        );

        for (const sc of stickyScenes) {
          const parallax = Number(sc.getAttribute("data-parallax") || "0.18");
          const img = sc.querySelector("img");
          if (!img) continue;

          const rect = sc.getBoundingClientRect();
          const vh = window.innerHeight || 800;

          // progress: 0(진입) → 1(통과)
          const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));

          // translateY 범위: -20px ~ +20px 정도(강도는 parallax로 제어)
          const max = 120 * parallax; // parallax=0.18이면 ~21px
          const y = (progress - 0.5) * 2 * max;

          img.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
          img.style.willChange = "transform";
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function ViewPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /article/:id
  const idNum = useMemo(() => Number(id), [id]);

  const { toast, show } = useToast();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = savedIds.includes(idNum);

  /* =============================================================================
    ✅ 글 로드 + 조회수 증가
  ============================================================================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // ✅ public 뷰는 published만 가져오는 함수 사용(권한 안전)
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

  // ✅ contentHTML이 바뀌면(=글이 로드되면) scene effects 적용
  useSceneEffects([article?.contentHTML]);

  /* =============================================================================
    ✅ 좋아요 (services에서 쿨다운/중복방지 꼭 처리하는 구조가 이상적)
  ============================================================================= */
  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("좋아해주셔서 감사해요💕");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("cooldown")) show("⏳ 3시간 뒤에 다시 좋아요 가능해요");
      else show("😵 좋아요 처리 실패");
    }
  }

  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요! (기기별 저장)" : "☆ 저장 해제");
  }

  // ✅ 커버: object or string 호환
  const coverUrl =
    (article?.cover && typeof article.cover === "object" ? article.cover.url : article?.cover) || "";

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

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
                backgroundImage: coverUrl
                  ? `url(${coverUrl})`
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

                  {/* ✅ 핵심: section[data-uf-scene] 기반으로 연출이 적용될 영역 */}
                  <div
                    className="uf-articleBody"
                    dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                  />

                  <div style={{ marginTop: 26 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

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

                      {/* ✅ Edit은 /write/:id 로 */}
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
