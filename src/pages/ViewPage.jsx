// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  bumpLikes,
  bumpViews,
  getPublishedArticleByIdNumber,
} from "../services/articles";

import { toggleSaved, getSavedIds } from "../services/bookmarks";
import CommentBox from "../components/CommentBox";

/* =============================================================================
  ✅ 날짜 포맷 (Firestore Timestamp / number / string 대응)
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
  ✅ 읽는 시간(대략) 계산
  - HTML에서 텍스트만 추출해서 words/chars로 보정
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

/* =============================================================================
  ✅ Sticky Story DOM 보강
  - TipTap node가 <section data-uf-sticky ...> 안에 "문단들"만 넣어놔서
    뷰에서는 CSS가 기대하는 구조(.uf-stickyMedia / .uf-stickyText)를 만들어줍니다.
============================================================================= */
function enhanceStickyStories(rootEl) {
  if (!rootEl) return;

  const blocks = rootEl.querySelectorAll("section[data-uf-sticky]");
  blocks.forEach((sec) => {
    // 이미 보강됐으면 중복 작업 방지
    if (sec.dataset.enhanced === "1") return;
    sec.dataset.enhanced = "1";

    const mediaSrc = sec.getAttribute("data-media-src") || "";

    // 1) 기존 자식들(문단/리스트 등)을 텍스트 래퍼로 옮김
    const textWrap = document.createElement("div");
    textWrap.className = "uf-stickyText";

    // sec의 기존 노드들을 전부 textWrap로 이동
    while (sec.firstChild) {
      textWrap.appendChild(sec.firstChild);
    }

    // 2) 미디어 래퍼 생성
    const mediaWrap = document.createElement("div");
    mediaWrap.className = "uf-stickyMedia";

    if (mediaSrc) {
      const img = document.createElement("img");
      img.src = mediaSrc;
      img.alt = "sticky media";
      mediaWrap.appendChild(img);
    } else {
      // 미디어가 없으면 안내 박스(글쓴이/관리자가 보고 바로 알 수 있게)
      const placeholder = document.createElement("div");
      placeholder.style.padding = "14px";
      placeholder.style.color = "var(--muted)";
      placeholder.style.fontSize = "13px";
      placeholder.innerText = "📌 Sticky media가 비어 있어요. (Editor에서 🧷 Sticky 미디어 업로드로 설정)";
      mediaWrap.appendChild(placeholder);
    }

    // 3) sec에 2개 컬럼 구조로 다시 붙임
    sec.appendChild(mediaWrap);
    sec.appendChild(textWrap);
  });
}

/* =============================================================================
  ✅ Reveal(등장) 효과
============================================================================= */
function setupReveal(rootEl) {
  if (!rootEl) return () => {};

  const targets = Array.from(rootEl.querySelectorAll(".uf-reveal"));
  // 기본: 처음부터 보이게 하고 싶으면 이 줄 제거
  targets.forEach((el) => el.classList.remove("is-in"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) ent.target.classList.add("is-in");
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/* =============================================================================
  ✅ Parallax(스크롤) 효과
  - data-uf-parallax 가진 img.uf-parallax를 찾아서 speed 적용
  - speed는 TipTap 노드 attr로 저장되지만 HTML에는 남지 않으므로:
    현재는 "기본 speed"로 동작하고,
    다음 스텝에서 data-speed로 내려주게 확장하면 더 세밀해짐.
============================================================================= */
function setupParallax(rootEl) {
  if (!rootEl) return () => {};

  const imgs = Array.from(rootEl.querySelectorAll("img[data-uf-parallax].uf-parallax"));

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;

      const vh = window.innerHeight || 800;

      imgs.forEach((img) => {
        const rect = img.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const delta = (center - vh / 2) / (vh / 2); // -1 ~ 1
        const speed = 0.25; // ✅ 기본값 (다음 스텝에서 data-speed로 확장 가능)
        const y = Math.max(-28, Math.min(28, -delta * 40 * speed)); // clamp
        img.style.transform = `translateY(${y}px)`;
      });
    });
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  return () => {
    if (raf) window.cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

export default function ViewPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /article/:id
  const idNum = useMemo(() => Number(id), [id]);

  const { toast, show } = useToast();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  // ✅ Saved (로컬)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const saved = savedIds.includes(idNum);

  // ✅ 본문 DOM ref (여기서 sticky/reveal/parallax를 적용)
  const bodyRef = useRef(null);

  /* =============================================================================
    ✅ 글 로드 + 조회수 증가
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

        // ✅ View 진입 시 views +1 (쿨다운은 service에서 처리)
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
    ✅ 본문 렌더된 이후: Sticky / Reveal / Parallax 적용
  ============================================================================= */
  useEffect(() => {
    if (!article) return;
    const root = bodyRef.current;
    if (!root) return;

    // 1) Sticky DOM 보강
    enhanceStickyStories(root);

    // 2) Reveal
    const offReveal = setupReveal(root);

    // 3) Parallax
    const offParallax = setupParallax(root);

    return () => {
      offReveal?.();
      offParallax?.();
    };
  }, [article]);

  /* =============================================================================
    ✅ 좋아요
  ============================================================================= */
  async function onLike() {
    try {
      const next = await bumpLikes(idNum);
      setArticle((p) => (p ? { ...p, likes: next } : p));
      show("좋아해주셔서 감사해요💕");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("cooldown") || e?.code === "COOLDOWN") {
        show("⏳ 3시간 뒤에 다시 눌러주세요!");
      } else {
        show("😵 좋아요 처리에 실패했어요");
      }
    }
  }

  /* =============================================================================
    ✅ Saved
  ============================================================================= */
  function onToggleSave() {
    const r = toggleSaved(idNum);
    setSavedIds(r.ids);
    show(r.saved ? "★ 저장했어요! (이 기기에 저장돼요)" : "☆ 저장을 해제했어요");
  }

  const cover = article?.coverMedium || article?.coverThumb || article?.cover || "";
  const readMin = useMemo(() => calcReadingMin(article?.contentHTML), [article?.contentHTML]);

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
            <button className="uf-btn uf-btn--primary" onClick={() => nav("/")}>
              리스트로 돌아가기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* =============================================================================
            ✅ Hero (cover)
          ============================================================================= */}
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

          {/* =============================================================================
            ✅ Body grid
          ============================================================================= */}
          <section className="uf-viewBody">
            <div className="uf-wrap">
              <div className="uf-viewGrid">
                {/* ------------------ Article ------------------ */}
                <main className="uf-card uf-article">
                  {article.excerpt ? (
                    <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                      {article.excerpt}
                    </div>
                  ) : null}

                  {/* ✅ TipTap에서 저장된 HTML 렌더 */}
                  <div
                    ref={bodyRef}
                    className="ProseMirror"
                    dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                  />

                  {/* ✅ Comments */}
                  <div style={{ marginTop: 26 }}>
                    <CommentBox articleId={idNum} />
                  </div>
                </main>

                {/* ------------------ Side ------------------ */}
                <aside className="uf-side">
                  <div className="uf-card uf-sideBox">
                    <div className="uf-sideTitle">Quick Actions</div>
                    <div className="uf-sideInfo">
                      • 좋아요는 3시간 쿨다운<br />
                      • 저장(Saved)은 이 기기(localStorage)에 저장
                    </div>

                    <div className="uf-sideBtns">
                      <button className="uf-btn uf-btn--primary" onClick={onLike}>
                        💗 Like
                      </button>

                      <button className="uf-btn" onClick={onToggleSave}>
                        {saved ? "★ Saved" : "☆ Save"}
                      </button>

                      {/* ✅ Edit: /write/:id */}
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
