// src/pages/ListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getPublishedArticles } from "../services/articles";
import { getSavedIds, isSaved, toggleSaved } from "../services/bookmarks";
import { go } from "../utils/router";

const MAG_NAME = "U#";
const BACK_UNFRAME_URL = "https://unframe.imweb.me";

const CATEGORIES = [
  { key: "Exhibition", label: "Exhibition", no: "CATEGORY 01" },
  { key: "Project", label: "Project", no: "CATEGORY 02" },
  { key: "Artist Note", label: "Artist Note", no: "CATEGORY 03" },
  { key: "News", label: "News", no: "CATEGORY 04" },
];

const PAGE_SIZE = 6;

function estimateReadMinFromHTML(html) {
  const text = (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 1;
  const chars = text.length;
  return Math.max(1, Math.round(chars / 900));
}

function formatDate(createdAt) {
  try {
    if (!createdAt) return "";
    if (typeof createdAt?.seconds === "number") {
      const d = new Date(createdAt.seconds * 1000);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    }
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function pickCover(a) {
  return a.coverThumb || a.cover || "";
}

function normCategory(cat) {
  return (cat || "").trim();
}

export default function ListPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState("All"); // All | Exhibition | ... | Saved
  const [sortMode, setSortMode] = useState("latest"); // latest | popular
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1); // ✅ 페이지 넘버

  const [toast, setToast] = useState(null);
  const [savedIds, setSavedIdsState] = useState(() => getSavedIds());

  const heroRef = useRef(null);
  const archiveRef = useRef(null);
  const subscribeRef = useRef(null);

  const [navTheme, setNavTheme] = useState("light");

  function showToast(message, ms = 2400) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const list = await getPublishedArticles();
        if (!alive) return;
        setArticles(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        showToast("😵 리스트 로딩에 실패했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ nav 테마 자동 전환
  useEffect(() => {
    const sections = document.querySelectorAll("[data-nav]");
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (visible?.target) {
          const theme = visible.target.getAttribute("data-nav");
          if (theme === "dark" || theme === "light") setNavTheme(theme);
        }
      },
      { root: null, rootMargin: "-20% 0px -70% 0px", threshold: [0.1, 0.2, 0.3, 0.4, 0.5] }
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // ✅ 필터/검색/정렬 바뀌면 페이지 1로 리셋
  useEffect(() => {
    setPage(1);
  }, [activeCategory, sortMode, q]);

  function jumpToCategory(catKey) {
    setActiveCategory(catKey);
    setSortMode("latest");
    setQ("");
    requestAnimationFrame(() => archiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    showToast(`📚 ${catKey} 아카이브로 이동할게요!`);
  }

  function onNavArchive() {
    requestAnimationFrame(() => archiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function onNavSubscribe() {
    requestAnimationFrame(() => subscribeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function onNavSaved() {
    setActiveCategory("Saved");
    setSortMode("latest");
    setQ("");
    requestAnimationFrame(() => archiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    showToast("⭐ 저장한 글만 모아서 보여드릴게요!");
  }

  function onToggleSave(articleId) {
    const next = toggleSaved(articleId);
    setSavedIdsState(next);

    if (next.includes(Number(articleId))) {
      showToast("⭐ 저장했어요! (기기가 바뀌면 저장 목록도 달라질 수 있어요)");
    } else {
      showToast("🗑️ 저장을 해제했어요.");
    }
  }

  const editorsPick = useMemo(() => {
    const sorted = [...articles].sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
    return sorted.slice(0, 3);
  }, [articles]);

  const filtered = useMemo(() => {
    let list = [...articles];

    if (activeCategory === "Saved") {
      const ids = new Set(savedIds.map(Number));
      list = list.filter((a) => ids.has(Number(a.id)));
    } else if (activeCategory !== "All") {
      list = list.filter((a) => normCategory(a.category) === activeCategory);
    }

    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((a) => {
        const title = (a.title || "").toLowerCase();
        const excerpt = (a.excerpt || "").toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
        return title.includes(qq) || excerpt.includes(qq) || tags.includes(qq);
      });
    }

    if (sortMode === "popular") {
      list.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    } else {
      list.sort((a, b) => {
        const ta = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const tb = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return (tb || 0) - (ta || 0);
      });
    }

    return list;
  }, [articles, activeCategory, q, sortMode, savedIds]);

  // ✅ 페이지 계산
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  function onClickTag(tag) {
    const t = String(tag || "").trim();
    if (!t) return;
    setQ(t);
    showToast(`🔎 #${t} 태그로 찾는 중이에요!`);
  }

  function openArticle(a) {
    go(`?mode=view&id=${a.id}`);
  }

  function setFilter(cat) {
    setActiveCategory(cat);
    showToast(`📌 ${cat === "All" ? "전체" : cat}로 필터했어요!`);
  }

  // ✅ 페이지 넘버 UI (너무 많아지면 1… 6 7 8 … 마지막 같은 방식으로 개선 가능)
  const pageNumbers = useMemo(() => {
    const max = totalPages;
    const cur = safePage;

    // 간단 버전: 1~max 전부 노출 (나중에 글 많아지면 축약 UI로 바꾸자)
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [totalPages, safePage]);

  return (
    <div className="uf-page">
      {/* NAV */}
      <header className={`uf-nav ${navTheme === "dark" ? "uf-nav--dark" : "uf-nav--light"}`}>
        <div className="uf-nav__inner">
          <button
            className="uf-nav__brand"
            onClick={() => heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            title="홈으로"
          >
            {MAG_NAME}
          </button>

          <nav className="uf-nav__links">
            <a className="uf-nav__link" href={BACK_UNFRAME_URL} target="_blank" rel="noreferrer">
              back UNFRAME
            </a>

            <button className="uf-nav__linkBtn" onClick={onNavArchive}>
              Archive
            </button>

            <button className="uf-nav__linkBtn" onClick={onNavSubscribe}>
              Subscription
            </button>

            <button className="uf-nav__linkBtn" onClick={onNavSaved}>
              Saved ({savedIds.length})
            </button>
          </nav>
        </div>
      </header>

      {toast && <div className="uf-toast">{toast}</div>}

      {/* Section 1 HERO */}
      <section ref={heroRef} className="uf-sec uf-hero" data-nav="dark">
        <div className="uf-hero__overlay" />
        <div className="uf-container uf-hero__content">
          <div className="uf-hero__kicker">UNFRAME / Independent Art Magazine</div>
          <h1 className="uf-hero__title">Unframe Your Perspective.</h1>
          <p className="uf-hero__sub">전시, 프로젝트, 아티스트 노트, 뉴스까지—예술을 프레임 밖에서 기록합니다.</p>

          <div className="uf-hero__ctaRow">
            <button className="uf-btn uf-btn--primary" onClick={onNavArchive}>
              Browse Archive →
            </button>
            <button className="uf-btn uf-btn--ghost" onClick={onNavSubscribe}>
              Subscribe ↓
            </button>
          </div>
        </div>
      </section>

      {/* Section 2 Categories */}
      <section className="uf-sec uf-cats" data-nav="light">
        <div className="uf-container">
          <div className="uf-sec__head">
            <h2 className="uf-sec__title">Categories</h2>
            <p className="uf-sec__desc">카테고리를 선택하면 해당 글만 최신순으로 보여드릴게요.</p>
          </div>

          <div className="uf-catRail" role="list">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                className="uf-catTile"
                onClick={() => jumpToCategory(c.key)}
                role="listitem"
                type="button"
              >
                <div className="uf-catTile__meta">{c.no}</div>
                <div className="uf-catTile__title">{c.label}</div>
                <div className="uf-catTile__link">View gallery →</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 Marquee */}
      <section className="uf-sec uf-marqueeSec" data-nav="dark">
        <div className="uf-marquee" aria-hidden="true">
          <div className="uf-marquee__track">
            <span>New drop every week • UNFRAME • Curated editorial archive • </span>
            <span>New drop every week • UNFRAME • Curated editorial archive • </span>
            <span>New drop every week • UNFRAME • Curated editorial archive • </span>
          </div>
        </div>

        <div className="uf-container uf-miniSub">
          <div className="uf-miniSub__box">
            <div className="uf-miniSub__title">Subscribe (mini)</div>
            <div className="uf-miniSub__desc">짧게, 가볍게—새 글이 나오면 알려드릴게요.</div>
            <div className="uf-miniSub__row">
              <input className="uf-input" placeholder="your@email.com" />
              <button className="uf-btn uf-btn--primary" onClick={() => showToast("💌 구독 기능은 곧 연결할게요!")}>
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 Editor */}
      <section className="uf-sec uf-editors" data-nav="light">
        <div className="uf-container">
          <div className="uf-editorsGrid">
            <div className="uf-note">
              <div className="uf-note__kicker">Editor’s Note</div>
              <h3 className="uf-note__title">Letters to the future.</h3>
              <p className="uf-note__text">
                UNFRAME은 “기록”을 디자인합니다. 텍스트와 이미지, 그리고 필요한 만큼의 인터랙션만 남깁니다.
              </p>
              <button className="uf-btn uf-btn--ghost" onClick={onNavArchive}>
                Explore Archive →
              </button>
            </div>

            <div className="uf-picks">
              <div className="uf-picks__head">
                <div className="uf-note__kicker">Editor’s Pick</div>
                <div className="uf-picks__hint">좋아요 기준 TOP 3 (임시)</div>
              </div>

              <div className="uf-picks__list">
                {editorsPick.map((a) => {
                  const mins = estimateReadMinFromHTML(a.contentHTML);
                  return (
                    <button key={a.id} className="uf-pickItem" onClick={() => openArticle(a)}>
                      <div className="uf-pickItem__no">No.{a.id}</div>
                      <div className="uf-pickItem__title">{a.title}</div>
                      <div className="uf-pickItem__meta">
                        <span>📖 {mins} min</span>
                        <span>♥ {Number(a.likes || 0)}</span>
                        <span>👁 {Number(a.views || 0)}</span>
                      </div>
                    </button>
                  );
                })}
                {!editorsPick.length && <div className="uf-empty">아직 글이 없어요. 첫 번째 글을 발행해볼까요? ✍️</div>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 Archive */}
      <section ref={archiveRef} className="uf-sec uf-archive" data-nav="light">
        <div className="uf-container">
          <div className="uf-archiveHead">
            <h2 className="uf-sec__title">Archive</h2>
            <p className="uf-sec__desc">카테고리/인기순/최신순/검색으로 탐색해보세요.</p>
          </div>

          <div className="uf-archiveLayout">
            <aside className="uf-archiveLeft">
              <div className="uf-leftBox">
                <div className="uf-leftBox__title">Filters</div>

                <div className="uf-leftBox__list">
                  <button className={`uf-leftItem ${activeCategory === "All" ? "is-active" : ""}`} onClick={() => setFilter("All")}>
                    All
                  </button>

                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      className={`uf-leftItem ${activeCategory === c.key ? "is-active" : ""}`}
                      onClick={() => setFilter(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}

                  <button
                    className={`uf-leftItem ${activeCategory === "Saved" ? "is-active" : ""}`}
                    onClick={() => setFilter("Saved")}
                    title="이 기기에서 저장한 글"
                  >
                    Saved ⭐ ({savedIds.length})
                  </button>
                </div>

                <div className="uf-leftBox__mini">
                  <div className="uf-leftBox__miniTitle">Sort</div>
                  <div className="uf-chipRow">
                    <button className={`uf-chip ${sortMode === "latest" ? "is-on" : ""}`} onClick={() => setSortMode("latest")}>
                      Latest
                    </button>
                    <button className={`uf-chip ${sortMode === "popular" ? "is-on" : ""}`} onClick={() => setSortMode("popular")}>
                      Popular
                    </button>
                  </div>
                </div>

                <div className="uf-leftBox__mini">
                  <div className="uf-leftBox__miniTitle">Search</div>
                  <input className="uf-input uf-input--dark" value={q} onChange={(e) => setQ(e.target.value)} placeholder="title / excerpt / tag" />
                  <div className="uf-leftHint">태그를 클릭하면 자동 검색돼요. ✨</div>
                </div>
              </div>
            </aside>

            <main className="uf-archiveRight">
              {loading && <div className="uf-loading">로딩 중… ⏳</div>}

              {!loading && !filtered.length && (
                <div className="uf-emptyBox">
                  <div className="uf-emptyBox__title">😮 검색 결과가 없어요</div>
                  <div className="uf-emptyBox__desc">다른 카테고리로 바꾸거나, 검색어를 조금 줄여볼까요?</div>
                </div>
              )}

              <div className="uf-cards">
                {pageItems.map((a) => {
                  const cover = pickCover(a);
                  const mins = estimateReadMinFromHTML(a.contentHTML);
                  const saved = isSaved(a.id);

                  return (
                    <article key={a.id} className="uf-card">
                      <button className="uf-card__media" onClick={() => openArticle(a)} type="button">
                        {cover ? <img src={cover} alt={a.title || "cover"} loading="lazy" /> : <div className="uf-card__ph">No Image</div>}
                      </button>

                      <div className="uf-card__body">
                        <div className="uf-card__topline">
                          <div className="uf-card__cat">{a.category || "Category"}</div>
                          <div className="uf-card__meta">
                            <span>{formatDate(a.createdAt)}</span>
                            <span>📖 {mins} min</span>
                            <span>♥ {Number(a.likes || 0)}</span>
                            <span>👁 {Number(a.views || 0)}</span>
                          </div>
                        </div>

                        <button className="uf-card__title" onClick={() => openArticle(a)} type="button">
                          {a.title || `No.${a.id}`}
                        </button>

                        {a.excerpt ? <div className="uf-card__excerpt">{a.excerpt}</div> : null}

                        {Array.isArray(a.tags) && a.tags.length ? (
                          <div className="uf-tagRow">
                            {a.tags.slice(0, 6).map((t) => (
                              <button key={t} className="uf-tag" onClick={() => onClickTag(t)} type="button">
                                #{t}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div className="uf-card__actions">
                          <button className="uf-btnMini" onClick={() => openArticle(a)} type="button">
                            Read →
                          </button>

                          <button className={`uf-btnMini ${saved ? "is-saved" : ""}`} onClick={() => onToggleSave(a.id)} type="button">
                            {saved ? "⭐ Saved" : "☆ Save"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* ✅ 페이지 넘버 */}
              {!loading && filtered.length > 0 && (
                <div className="uf-pageNav">
                  <button className="uf-btnMini" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    ← Prev
                  </button>

                  <div className="uf-pageNums">
                    {pageNumbers.map((n) => (
                      <button
                        key={n}
                        className={`uf-pageNum ${n === safePage ? "is-on" : ""}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <button className="uf-btnMini" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next →
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Section 6 Subscription */}
      <section ref={subscribeRef} className="uf-sec uf-bigSub" data-nav="light">
        <div className="uf-container">
          <div className="uf-bigSub__box">
            <div className="uf-bigSub__kicker">Subscription</div>
            <h2 className="uf-bigSub__title">Any letter that inspires you.</h2>
            <p className="uf-bigSub__desc">읽어볼 만한 글을 모아서 보내드릴게요. (지금은 UI만)</p>

            <div className="uf-bigSub__row">
              <input className="uf-input uf-input--big" placeholder="your@email.com" />
              <button className="uf-btn uf-btn--primary" onClick={() => showToast("💌 구독 기능은 곧 연결할게요!")}>
                Subscribe
              </button>
            </div>

            <div className="uf-bigSub__fine">✨ 스팸은 싫어요. 구독 해지는 언제든지 가능하게 만들게요.</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="uf-footer" data-nav="light">
        <div className="uf-container uf-footer__inner">
          <div className="uf-footer__brand">{MAG_NAME} / UNFRAME</div>
          <div className="uf-footer__copy">© {new Date().getFullYear()} UNFRAME. All rights reserved.</div>
          <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=editor")}>
            Write →
          </button>
        </div>
      </footer>
    </div>
  );
}
