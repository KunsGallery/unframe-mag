// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  bumpLikes,
  bumpViews,
  getPublishedArticleByIdNumber, // ✅ 공개 페이지에서는 published 전용이 안전
} from "../services/articles";

import { toggleSaved, getSavedIds, onSavedChanged } from "../services/bookmarks";
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
  ✅ HTML → 텍스트 (리딩타임 계산용)
  - 아주 가벼운 방식 (정확도 충분)
============================================================================= */
function stripHtml(html) {
  try {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

/* =============================================================================
  ✅ 리딩 타임 (대략 220wpm 기준)
============================================================================= */
function calcReadingTimeMinutes(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const wpm = 220;
  const mins = Math.max(1, Math.round(words / wpm));
  return { mins, words };
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
  ✅ Reveal (IntersectionObserver)
  - .uf-reveal 요소가 화면에 들어오면 .is-visible 클래스 추가
============================================================================= */
function useRevealObserver(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll(".uf-reveal"));
    if (targets.length === 0) return;

    // 이미 visible 처리된 것은 스킵하고 싶으면 여기서 필터링 가능
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            // 한 번 보이면 관찰 해제 (미디엄/숏핸드 느낌)
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* =============================================================================
  ✅ Parallax (scroll + requestAnimationFrame)
  - 이미지에 class="uf-parallax"가 붙어있으면
    스크롤에 따라 translateY를 살짝 적용
============================================================================= */
function useParallax(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll("img.uf-parallax"));
    if (targets.length === 0) return;

    let rafId = 0;

    const tick = () => {
      rafId = 0;

      const vh = window.innerHeight || 800;
      targets.forEach((img) => {
        const rect = img.getBoundingClientRect();

        // 화면 근처일 때만 연산 (성능)
        if (rect.bottom < -200 || rect.top > vh + 200) return;

        // 진행도: -0.2 ~ 1.2 범위 정도로
        const progress = (rect.top - vh * 0.5) / (vh * 0.8);
        // 움직임 강도 (px) — 여기 숫자만 바꾸면 감성 확 바뀜
        const strength = 22;

        const y = Math.max(-1, Math.min(1, progress)) * strength * -1;
        img.style.transform = `translateY(${y.toFixed(2)}px)`;
      });
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    };

    // 초기 1회
    tick();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
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

  // ✅ 본문 DOM 참조 (Reveal/Parallax 스캔용)
  const bodyRef = useRef(null);

  // ✅ Saved (로컬)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = savedIds.includes(idNum);

  // 다른 탭에서 Saved 변경 감지
  useEffect(() => {
    const off = onSavedChanged?.((ids) => setSavedIds(ids));
    return off;
  }, []);

  /* =============================================================================
    ✅ 글 불러오기 + 조회수 증가 (쿨다운은 bumpViews 내부)
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

        // 조회수 증가(실패해도 UX 치명적 아님)
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
    ✅ 리딩타임 계산
  ============================================================================= */
  const reading = useMemo(() => {
    const text = stripHtml(article?.contentHTML || "");
    return calcReadingTimeMinutes(text);
  }, [article?.contentHTML]);

  /* =============================================================================
    ✅ Reveal / Parallax 적용
    - article 로드 후 실행되도록 deps에 article?.contentHTML을 넣음
  ============================================================================= */
  useRevealObserver(bodyRef, [article?.contentHTML]);
  useParallax(bodyRef, [article?.contentHTML]);

  /* =============================================================================
    ✅ 좋아요 (쿨다운은 bumpLikes 내부)
  ============================================================================= */
  async function onLike() {
    try {
      const nextLikes = await bumpLikes(idNum);
      setArticle((p) => (p ? { ...p, likes: nextLikes } : p));
      show("좋아해주셔서 감사해요 💕");
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
    ✅ Saved 토글
  ============================================================================= */
  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요! (기기별 저장)" : "☆ 저장을 해제했어요");
  }

  const cover = article?.coverMedium || article?.coverThumb || article?.cover || "";

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      {/* =============================================================================
        ✅ Topbar
      ============================================================================= */}
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" type="button" onClick={() => nav("/")}>
              U#
            </button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav("/")}>
                Archive
              </button>
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav("/saved")}>
                Saved
              </button>

              <button className="uf-btn" type="button" onClick={toggleTheme}>
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
            <button className="uf-btn uf-btn--primary" type="button" onClick={() => nav("/")}>
              리스트로 돌아가기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* =============================================================================
            ✅ Hero (cover)
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

                {/* ✅ Meta: date / views / likes / reading time */}
                <div className="uf-hero__meta">
                  <span>🗓 {formatDate(article.createdAt)}</span>
                  <span>👁 {Number(article.views || 0)}</span>
                  <span>💗 {Number(article.likes || 0)}</span>
                  <span title={`${reading.words} words`}>⏱ {reading.mins} min</span>
                </div>
              </div>
            </div>
          </section>

          {/* =============================================================================
            ✅ Body grid
          ============================================================================= */}
          <section className="uf-viewBody">
            <div className="uf-wrap">
              <div className="uf-viewGrid">
                {/* ---------------- Main ---------------- */}
                <main className="uf-card uf-article">
                  {/* excerpt */}
                  {article.excerpt ? (
                    <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
                      {article.excerpt}
                    </div>
                  ) : null}

                  {/* 본문 */}
                  <div
                    ref={bodyRef}
                    className="ProseMirror"
                    dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                  />

                  {/* comments */}
                  <div style={{ marginTop: 26 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                {/* ---------------- Side ---------------- */}
                <aside className="uf-side">
                  <div className="uf-card uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>

                    <div className="uf-sideInfo">
                      ✨ 좋아요는 3시간 쿨다운이 있고,
                      <br />
                      저장은 “로컬(기기별)”로 동작해요.
                    </div>

                    <div className="uf-sideBtns">
                      <button className="uf-btn uf-btn--primary" type="button" onClick={onLike}>
                        💗 Like
                      </button>

                      <button className="uf-btn" type="button" onClick={onToggleSave}>
                        {saved ? "★ Saved" : "☆ Save"}
                      </button>

                      {/* ✅ Edit → /write/:id */}
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
