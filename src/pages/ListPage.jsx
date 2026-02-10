import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";
import { getEditorPickIds } from "../services/config";
import { getPublishedArticles } from "../services/articles";

const PAGE_SIZE = 6;
const HERO_BG = "/hero.jpg";

const CATEGORIES = [
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01" },
  { key: "Project", label: "Project", sub: "CATEGORY 02" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03" },
  { key: "News", label: "News", sub: "CATEGORY 04" },
];

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

function clampText(s, n = 120) {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
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

export default function ListPage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const archiveRef = useRef(null);

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pickIds, setPickIds] = useState([]);
  const [pickLoading, setPickLoading] = useState(true);

  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const [savedMode, setSavedMode] = useState(false);

  const activeCat = searchParams.get("cat") || "All";
  const sortBy = searchParams.get("sort") || "latest";
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);

  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

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
    return () => (alive = false);
  }, []);

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
    return () => (alive = false);
  }, []);

  function setQuery(next) {
    const merged = {
      page: String(next.page ?? page),
      cat: String(next.cat ?? activeCat),
      sort: String(next.sort ?? sortBy),
      q: String(next.q ?? q),
    };
    setSearchParams(merged);
  }

  function scrollToArchive() {
    archiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    let list = [...all];

    if (savedMode) list = list.filter((a) => savedIds.includes(Number(a.id)));
    if (activeCat !== "All") list = list.filter((a) => a.category === activeCat);

    if (keyword) {
      list = list.filter((a) => {
        const t = String(a.title || "").toLowerCase();
        const e = String(a.excerpt || "").toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
        return t.includes(keyword) || e.includes(keyword) || tags.includes(keyword);
      });
    }

    if (sortBy === "popular") {
      list.sort(
        (x, y) =>
          Number(y.likes || 0) + Number(y.views || 0) - (Number(x.likes || 0) + Number(x.views || 0))
      );
    } else {
      list.sort((x, y) => {
        const ax = x.createdAt?.toMillis?.() ?? (x.createdAt?.seconds ? x.createdAt.seconds * 1000 : 0) ?? 0;
        const ay = y.createdAt?.toMillis?.() ?? (y.createdAt?.seconds ? y.createdAt.seconds * 1000 : 0) ?? 0;
        return ay - ax;
      });
    }

    return list;
  }, [all, activeCat, sortBy, q, savedIds, savedMode]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);

  const pageItems = useMemo(() => {
    const safePage = Math.max(1, Math.min(totalPages, page));
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  const pickArticles = useMemo(() => {
    if (!pickIds.length) return [];
    const map = new Map(all.map((a) => [Number(a.id), a]));
    return pickIds.map((id) => map.get(Number(id))).filter(Boolean);
  }, [all, pickIds]);

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
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" type="button" onClick={() => navigate("/")}>U#</button>
            <div className="uf-nav">
              <a className="uf-btn uf-btn--ghost" href="https://unframe.kr" target="_blank" rel="noreferrer">
                Back UNFRAME
              </a>
              <button className="uf-btn uf-btn--ghost" type="button" onClick={scrollToArchive}>Archive</button>
              <button className="uf-btn uf-btn--ghost" type="button" onClick={onClickSaved}>
                Saved ({savedIds.length})
              </button>
              <button className="uf-btn" type="button" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="uf-hero">
        <div className="uf-heroBg" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="uf-heroOverlay" />
        <div className="uf-wrap">
          <div className="uf-heroCard">
            <div className="uf-heroKicker">UNFRAME MAGAZINE</div>
            <div className="uf-heroTitle">Any Letter That Inspires You.</div>
            <div className="uf-heroSub">
              A Journal of Art, Space, and People.<br />
              전시 · 프로젝트 · 아티스트 노트 · 뉴스
            </div>
            <div className="uf-heroBtns">
              <button className="uf-btn uf-btn--primary" type="button" onClick={scrollToArchive}>Archive 보기 →</button>
              <button className="uf-btn uf-btn--ghost" type="button" onClick={onClickSaved}>Saved 보기 →</button>
            </div>
          </div>
        </div>
      </section>

      <section className="uf-sec">
        <div className="uf-wrap">
          <div className="uf-catsRow">
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" className="uf-catCard" onClick={() => onClickCategory(c.key)}>
                <div className="uf-catSub">{c.sub}</div>
                <div className="uf-catTitle">{c.label}</div>
                <div className="uf-catHint">VIEW →</div>
              </button>
            ))}
          </div>
        </div>
      </section>

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
                    <button key={a.id} type="button" className="uf-pickItem" onClick={() => openArticle(Number(a.id))}>
                      <span className="uf-pickBadge">PICK</span>
                      <span className="uf-pickTitle">{a.title || "(no title)"}</span>
                      <span className="uf-pickMeta">{a.category} · {formatDate(a.createdAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="uf-sec" ref={archiveRef}>
        <div className="uf-wrap">
          <div className="uf-archiveLayout">
            <aside className="uf-archiveSide">
              <div className="uf-sideBox">
                <div className="uf-sideTitle">Archive</div>

                <button
                  type="button"
                  className={`uf-sideItem ${activeCat === "All" && !savedMode ? "is-active" : ""}`}
                  onClick={() => { setSavedMode(false); setQuery({ cat: "All", q: "", page: 1 }); }}
                >
                  All
                </button>

                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`uf-sideItem ${activeCat === c.key && !savedMode ? "is-active" : ""}`}
                    onClick={() => { setSavedMode(false); setQuery({ cat: c.key, q: "", page: 1 }); }}
                  >
                    {c.label}
                  </button>
                ))}

                <button type="button" className={`uf-sideItem ${savedMode ? "is-active" : ""}`} onClick={onClickSaved}>
                  Saved
                </button>
              </div>
            </aside>

            <div>
              <div className="uf-archiveTopbar">
                <div className="uf-row" style={{ gap: 8 }}>
                  <button className={`uf-chip ${sortBy === "latest" ? "is-active" : ""}`} type="button"
                    onClick={() => setQuery({ sort: "latest", page: 1 })}>
                    최신순
                  </button>
                  <button className={`uf-chip ${sortBy === "popular" ? "is-active" : ""}`} type="button"
                    onClick={() => setQuery({ sort: "popular", page: 1 })}>
                    인기순
                  </button>
                </div>

                <input className="uf-input uf-search" value={q} onChange={(e) => setQuery({ q: e.target.value, page: 1 })}
                  placeholder="검색 (제목/요약/태그)" />
              </div>

              {loading ? (
                <div style={{ padding: 18, color: "var(--muted)" }}>로딩 중… ⏳</div>
              ) : pageItems.length === 0 ? (
                <div style={{ padding: 18, color: "var(--muted)" }}>표시할 글이 없어요 🥲</div>
              ) : (
                <div className="uf-cards">
                  {pageItems.map((a) => {
                    const id = Number(a.id);
                    const saved = savedIds.includes(id);
                    const cover = a.coverMedium || a.coverThumb || a.cover || "";
                    const readMin = calcReadingMin(a.contentHTML);

                    return (
                      <article key={id} className="uf-card uf-cardItem" onClick={() => openArticle(id)}>
                        <div className="uf-cardImg" style={{ backgroundImage: cover ? `url(${cover})` : "none" }} />
                        <div className="uf-cardBody">
                          <div className="uf-cardMeta">
                            <span className="uf-badge">{a.category || "Category"}</span>
                            <span>{formatDate(a.createdAt)}</span>
                          </div>

                          <div className="uf-cardTitle">{a.title || "(no title)"}</div>
                          <div className="uf-cardExcerpt">{clampText(a.excerpt || "", 120)}</div>

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

              {filtered.length > PAGE_SIZE && (
                <div className="uf-pager">
                  <button className="uf-pagerBtn" type="button" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                    ← Prev
                  </button>

                  <div className="uf-row" style={{ gap: 6 }}>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} className={`uf-pagerNum ${p === page ? "is-active" : ""}`} type="button"
                          onClick={() => goPage(p)}>
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button className="uf-pagerBtn" type="button" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

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
