// src/pages/ListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";
import { getEditorPickIds } from "../services/config";
import { getPublishedArticles } from "../services/articles";

/* =============================================================================
  ✅ Page constants
============================================================================= */
const PAGE_SIZE = 6;
const HERO_BG = "/hero.jpg";

/* =============================================================================
  ✅ Categories (고정 4개)
============================================================================= */
const CATEGORIES = [
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01" },
  { key: "Project", label: "Project", sub: "CATEGORY 02" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03" },
  { key: "News", label: "News", sub: "CATEGORY 04" },
];

/* =============================================================================
  ✅ Utilities
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

function clampText(s, n = 120) {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/**
 * ✅ 읽는 시간(대략) 계산
 * - HTML 제거 후 텍스트 추출
 * - 영어: 200~220wpm 근사
 * - 한글: 글자수 기반 근사
 * - 둘 중 더 큰 값을 사용 (너무 낮게 나오는 걸 방지)
 */
function stripHtml(html) {
  const s = String(html || "");
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calcReadingMin(html) {
  const text = stripHtml(html);
  if (!text) return 1;

  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.replace(/\s/g, "").length;

  const byWords = Math.ceil(words / 220);
  const byChars = Math.ceil(chars / 900);

  const m = Math.max(1, Math.min(99, Math.max(byWords, byChars)));
  return m;
}

export default function ListPage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* =============================================================================
    ✅ Refs (Archive 섹션 스크롤)
  ============================================================================= */
  const archiveRef = useRef(null);

  /* =============================================================================
    ✅ Data
  ============================================================================= */
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ✅ Editor’s Pick */
  const [pickIds, setPickIds] = useState([]);
  const [pickLoading, setPickLoading] = useState(true);

  /* ✅ Saved (로컬) */
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const [savedMode, setSavedMode] = useState(false);

  /* =============================================================================
    ✅ URL Sync
    - /?cat=...&sort=...&q=...&page=...
    - Saved 모드는 "상태"로만 두고, URL은 cat/sort/q/page만 동기화
============================================================================= */
  const activeCat = searchParams.get("cat") || "All";
  const sortBy = searchParams.get("sort") || "latest";
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);

  /* =============================================================================
    ✅ Saved 변경(다른 탭) 감지
  ============================================================================= */
  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  /* =============================================================================
    ✅ Load: published articles
  ============================================================================= */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const list = await getPublishedArticles();
        if (!alive) return;
        setAll(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* =============================================================================
    ✅ Load: editor pick ids
  ============================================================================= */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPickLoading(true);
        const ids = await getEditorPickIds();
        if (!alive) return;
        setPickIds(Array.isArray(ids) ? ids : []);
      } catch (e) {
        console.error(e);
        setPickIds([]);
      } finally {
        if (alive) setPickLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* =============================================================================
    ✅ query setter
    - 값이 안 바뀌어도 setSearchParams가 실행되면 렌더가 다시 돌 수 있으니
      merged를 항상 동일 구조로 유지
  ============================================================================= */
  function setQuery(next) {
    const merged = {
      page: String(next.page ?? page),
      cat: String(next.cat ?? activeCat),
      sort: String(next.sort ?? sortBy),
      q: String(next.q ?? q),
    };
    setSearchParams(merged);
  }

  /* =============================================================================
    ✅ scroll helpers
  ============================================================================= */
  function scrollToArchive() {
    const el = archiveRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* =============================================================================
    ✅ Filtering + Sorting
  ============================================================================= */
  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    let list = [...all];

    // ✅ Saved 모드면 savedIds에 포함된 글만
    if (savedMode) {
      list = list.filter((a) => savedIds.includes(Number(a.id)));
    }

    // ✅ Category
    if (activeCat !== "All") {
      list = list.filter((a) => a.category === activeCat);
    }

    // ✅ Search (title + excerpt + tags)
    if (keyword) {
      list = list.filter((a) => {
        const t = String(a.title || "").toLowerCase();
        const e = String(a.excerpt || "").toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
        return t.includes(keyword) || e.includes(keyword) || tags.includes(keyword);
      });
    }

    // ✅ Sort
    if (sortBy === "popular") {
      list.sort(
        (x, y) =>
          Number(y.likes || 0) +
          Number(y.views || 0) -
          (Number(x.likes || 0) + Number(x.views || 0))
      );
    } else {
      // latest
      list.sort((x, y) => {
        const ax =
          x.createdAt?.toMillis?.() ??
          (x.createdAt?.seconds ? x.createdAt.seconds * 1000 : 0) ??
          Number(x.createdAt || 0) ??
          0;

        const ay =
          y.createdAt?.toMillis?.() ??
          (y.createdAt?.seconds ? y.createdAt.seconds * 1000 : 0) ??
          Number(y.createdAt || 0) ??
          0;

        return ay - ax;
      });
    }

    return list;
  }, [all, activeCat, sortBy, q, savedIds, savedMode]);

  /* =============================================================================
    ✅ Pagination
  ============================================================================= */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);

  const pageItems = useMemo(() => {
    const safePage = Math.max(1, Math.min(totalPages, page));
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  /* =============================================================================
    ✅ Editor Pick articles (id 매칭)
  ============================================================================= */
  const pickArticles = useMemo(() => {
    if (!pickIds.length) return [];
    const map = new Map(all.map((a) => [Number(a.id), a]));
    return pickIds.map((id) => map.get(Number(id))).filter(Boolean);
  }, [all, pickIds]);

  /* =============================================================================
    ✅ Actions
  ============================================================================= */
  function onClickCategory(catKey) {
    setSavedMode(false);
    setQuery({ cat: catKey, sort: "latest", q: "", page: 1 });
    scrollToArchive();
  }

  function onClickSaved() {
    setSavedMode(true);
    setQuery({ cat: "All", sort: "latest", q: "", page: 1 });
    scrollToArchive();
  }

  function openArticle(id) {
    navigate(`/article/${id}`);
  }

  function goPage(nextPage) {
    const p = Math.max(1, Math.min(totalPages, nextPage));
    setQuery({ page: p });
  }

  return (
    <div className="uf-page">
      {/* =============================================================================
        ✅ Topbar
      ============================================================================= */}
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" type="button" onClick={() => navigate("/")}>
              U#
            </button>

            <div className="uf-nav">
              {/* 외부 링크 */}
              <a className="uf-btn uf-btn--ghost" href="https://unframe.kr" target="_blank" rel="noreferrer">
                Back UNFRAME
              </a>

              {/* Archive 스크롤 */}
              <button className="uf-btn uf-btn--ghost" type="button" onClick={scrollToArchive}>
                Archive
              </button>

              {/* Saved 모드로 전환 + Archive로 */}
              <button className="uf-btn uf-btn--ghost" type="button" onClick={onClickSaved}>
                Saved ({savedIds.length})
              </button>

              {/* Theme toggle */}
              <button className="uf-btn" type="button" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =============================================================================
        ✅ Hero
      ============================================================================= */}
      <section className="uf-hero">
        <div className="uf-heroBg" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="uf-heroOverlay" />
        <div className="uf-wrap">
          <div className="uf-heroCard">
            <div className="uf-heroKicker">UNFRAME MAGAZINE</div>
            <div className="uf-heroTitle">Any Letter That Inspires You.</div>
            <div className="uf-heroSub">
              A Journal of Art, Space, and People.
              <br />
              전시 · 프로젝트 · 아티스트 노트 · 뉴스
            </div>

            <div className="uf-heroBtns">
              <button className="uf-btn uf-btn--primary" type="button" onClick={scrollToArchive}>
                Archive 보기 →
              </button>

              {/* ✅ Saved는 별도 페이지 없이 섹션5에서만 보여주기로 했으니,
                  여기 버튼도 savedMode로 전환시키는 UX가 더 자연스러움 */}
              <button className="uf-btn uf-btn--ghost" type="button" onClick={onClickSaved}>
                Saved 보기 →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================================
        ✅ Categories
      ============================================================================= */}
      <section className="uf-sec">
        <div className="uf-wrap">
          <div className="uf-catsRow">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className="uf-catCard"
                onClick={() => onClickCategory(c.key)}
              >
                <div className="uf-catSub">{c.sub}</div>
                <div className="uf-catTitle">{c.label}</div>
                <div className="uf-catHint">VIEW →</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================================================
        ✅ Editor's Pick
      ============================================================================= */}
      <section className="uf-sec">
        <div className="uf-wrap">
          <div className="uf-grid2">
            <div className="uf-noteBox">
              <div className="uf-boxTitle">Editor’s Note</div>
              <div className="uf-boxText">소개글/메모 영역이에요. (나중에 config로 연결 가능)</div>
            </div>

            <div className="uf-pickBox">
              <div className="uf-boxTitle">Editor’s Pick</div>

              {pickLoading ? (
                <div className="uf-boxText">로딩 중… ⏳</div>
              ) : pickArticles.length === 0 ? (
                <div className="uf-boxText">Pick이 비어 있어요 🥲</div>
              ) : (
                <div className="uf-pickList">
                  {pickArticles.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="uf-pickItem"
                      onClick={() => openArticle(Number(a.id))}
                    >
                      <span className="uf-pickBadge">PICK</span>
                      <span className="uf-pickTitle">{a.title || "(no title)"}</span>
                      <span className="uf-pickMeta">
                        {a.category} · {formatDate(a.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================================
        ✅ Archive (Section 5)
      ============================================================================= */}
      <section className="uf-sec" ref={archiveRef}>
        <div className="uf-wrap">
          <div className="uf-archiveLayout">
            {/* Left sticky menu */}
            <aside className="uf-archiveSide">
              <div className="uf-sideBox">
                <div className="uf-sideTitle">Archive</div>

                <button
                  type="button"
                  className={`uf-sideItem ${activeCat === "All" && !savedMode ? "is-active" : ""}`}
                  onClick={() => {
                    setSavedMode(false);
                    setQuery({ cat: "All", q: "", page: 1 });
                  }}
                >
                  All
                </button>

                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`uf-sideItem ${activeCat === c.key && !savedMode ? "is-active" : ""}`}
                    onClick={() => {
                      setSavedMode(false);
                      setQuery({ cat: c.key, q: "", page: 1 });
                    }}
                  >
                    {c.label}
                  </button>
                ))}

                <button
                  type="button"
                  className={`uf-sideItem ${savedMode ? "is-active" : ""}`}
                  onClick={onClickSaved}
                >
                  Saved
                </button>
              </div>
            </aside>

            {/* Right list */}
            <div>
              {/* Topbar: sort + search */}
              <div className="uf-archiveTopbar">
                <div className="uf-row" style={{ gap: 8 }}>
                  <button
                    className={`uf-chip ${sortBy === "latest" ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setQuery({ sort: "latest", page: 1 })}
                  >
                    최신순
                  </button>

                  <button
                    className={`uf-chip ${sortBy === "popular" ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setQuery({ sort: "popular", page: 1 })}
                  >
                    인기순
                  </button>
                </div>

                <input
                  className="uf-input uf-search"
                  value={q}
                  onChange={(e) => setQuery({ q: e.target.value, page: 1 })}
                  placeholder="검색 (제목/요약/태그)"
                />
              </div>

              {/* List */}
              {loading ? (
                <div style={{ padding: 18, color: "var(--muted)" }}>로딩 중… ⏳</div>
              ) : pageItems.length === 0 ? (
                <div style={{ padding: 18, color: "var(--muted)" }}>
                  {savedMode ? "Saved한 글이 아직 없어요 🥲" : "표시할 글이 없어요 🥲"}
                </div>
              ) : (
                <div className="uf-cards">
                  {pageItems.map((a) => {
                    const id = Number(a.id);
                    const saved = savedIds.includes(id);

                    // cover 우선순위
                    const cover = a.coverMedium || a.coverThumb || a.cover || "";

                    // ✅ reading time
                    const readMin = calcReadingMin(a.contentHTML);

                    return (
                      <article
                        key={id}
                        className="uf-card uf-cardItem"
                        onClick={() => openArticle(id)}
                      >
                        <div
                          className="uf-cardImg"
                          style={{ backgroundImage: cover ? `url(${cover})` : "none" }}
                        />

                        <div className="uf-cardBody">
                          <div className="uf-cardMeta">
                            <span className="uf-badge">{a.category || "Category"}</span>
                            <span>{formatDate(a.createdAt)}</span>
                          </div>

                          <div className="uf-cardTitle">{a.title || "(no title)"}</div>
                          <div className="uf-cardExcerpt">{clampText(a.excerpt || "", 120)}</div>

                          {/* Tags (카드 아래에만) */}
                          {Array.isArray(a.tags) && a.tags.length > 0 && (
                            <div className="uf-tags">
                              {a.tags.slice(0, 4).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  className="uf-tag"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setSavedMode(false);
                                    setQuery({ cat: "All", q: t, page: 1 });
                                  }}
                                >
                                  #{t}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="uf-cardBottom">
                            <div className="uf-stats">
                              <span>☕ {readMin} min</span>
                              <span>👁 {Number(a.views || 0)}</span>
                              <span>💗 {Number(a.likes || 0)}</span>
                            </div>

                            <button
                              type="button"
                              className={`uf-saveBtn ${saved ? "is-saved" : ""}`}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                const r = toggleSaved(id);
                                setSavedIds(r.ids);
                              }}
                              title="Save"
                            >
                              {saved ? "★ Saved" : "☆ Save"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className="uf-pager">
                  <button
                    className="uf-pagerBtn"
                    type="button"
                    disabled={page <= 1}
                    onClick={() => goPage(page - 1)}
                  >
                    ← Prev
                  </button>

                  <div className="uf-row" style={{ gap: 6 }}>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          className={`uf-pagerNum ${p === page ? "is-active" : ""}`}
                          type="button"
                          onClick={() => goPage(p)}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="uf-pagerBtn"
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => goPage(page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="uf-footer">
        <div className="uf-wrap">
          <div className="uf-row" style={{ justifyContent: "space-between" }}>
            <div>© UNFRAME MAG</div>
            <div style={{ opacity: 0.7 }}>Made with ♥</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
