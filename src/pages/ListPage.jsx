// src/pages/ListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Topbar from "../components/Topbar";

import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";
import { getEditorPickIds } from "../services/config";
import { getPublishedArticles } from "../services/articles";

const MAX_WIDTH = 1200;
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

export default function ListPage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const archiveRef = useRef(null);
  const subscribeRef = useRef(null);

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pickIds, setPickIds] = useState([]);
  const [pickLoading, setPickLoading] = useState(true);

  const [savedIds, setSavedIds] = useState(() => getSavedIds());

  // ✅ URL 파생 상태
  const activeCat = searchParams.get("cat") || "All";
  const sortBy = searchParams.get("sort") || "latest";
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const savedMode = searchParams.get("saved") === "1";

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
    return () => {
      alive = false;
    };
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
    return () => {
      alive = false;
    };
  }, []);

  function setQuery(next) {
    const nextCat = String(next.cat ?? activeCat);
    const nextSort = String(next.sort ?? sortBy);
    const nextQ = String(next.q ?? q);
    const nextPage = String(next.page ?? page);
    const nextSaved = String(next.saved ?? (savedMode ? "1" : "0"));

    const params = {};
    if (nextSaved === "1") params.saved = "1";
    if (nextCat && nextCat !== "All") params.cat = nextCat;
    if (nextSort && nextSort !== "latest") params.sort = nextSort;
    if (nextQ && nextQ.trim()) params.q = nextQ;
    if (nextPage && nextPage !== "1") params.page = nextPage;

    setSearchParams(params);
  }

  function scrollTo(ref) {
    const el = ref?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
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
      list.sort((x, y) => Number(y.likes || 0) + Number(y.views || 0) - (Number(x.likes || 0) + Number(x.views || 0)));
    } else {
      list.sort((x, y) => {
        const ax = x.createdAt?.toMillis?.() ?? (x.createdAt?.seconds ? x.createdAt.seconds * 1000 : 0) ?? Number(x.createdAt || 0);
        const ay = y.createdAt?.toMillis?.() ?? (y.createdAt?.seconds ? y.createdAt.seconds * 1000 : 0) ?? Number(y.createdAt || 0);
        return ay - ax;
      });
    }

    return list;
  }, [all, activeCat, sortBy, q, savedIds, savedMode]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);
  const safePage = Math.max(1, Math.min(totalPages, page));

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const pickArticles = useMemo(() => {
    if (!pickIds.length) return [];
    const map = new Map(all.map((a) => [Number(a.id), a]));
    return pickIds.map((id) => map.get(Number(id))).filter(Boolean);
  }, [all, pickIds]);

  function onClickSaved() {
    setQuery({ saved: "1", cat: "All", sort: "latest", q: "", page: 1 });
    scrollTo(archiveRef);
  }

  function onClickCategory(catKey) {
    setQuery({ saved: "0", cat: catKey, sort: "latest", q: "", page: 1 });
    scrollTo(archiveRef);
  }

  function goPage(nextPage) {
    const p = Math.max(1, Math.min(totalPages, nextPage));
    setQuery({ page: p });
  }

  function openArticle(id) {
    navigate(`/article/${id}`);
  }

  return (
    <div className="uf-listRoot">
      {/* ✅ 공용 Topbar로 교체 */}
      <Topbar
        theme={theme}
        toggleTheme={toggleTheme}
        brandTo="/"
        right={[
          { type: "external", label: "Back UNFRAME", href: "https://unframe.kr", className: "uf-btn uf-btn--ghost" },
          { type: "button", label: "Archive", onClick: () => scrollTo(archiveRef), className: "uf-btn uf-btn--ghost" },
          { type: "button", label: "Subscription", onClick: () => scrollTo(subscribeRef), className: "uf-btn uf-btn--ghost" },
          { type: "button", label: `Saved (${savedIds.length})`, onClick: onClickSaved, className: "uf-btn uf-btn--ghost" },
          { type: "theme" },
        ]}
      />

      {/* --- 이하 섹션들은 네 구조 그대로 유지 --- */}
      <section className="uf-sec uf-hero" style={{ backgroundImage: `url(${HERO_BG})` }}>
        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="uf-heroCard">
            <div className="uf-heroKicker">UNFRAME MAGAZINE</div>
            <h1 className="uf-heroTitle">Any Letter That Inspires You.</h1>
            <p className="uf-heroSub">
              A Journal of Art, Space, and People.
              <br />
              전시 · 프로젝트 · 아티스트 노트 · 뉴스
            </p>

            <div className="uf-heroBtns">
              <button className="uf-btn uf-btn--primary" type="button" onClick={() => scrollTo(archiveRef)}>
                Archive 보기 →
              </button>
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => scrollTo(subscribeRef)}>
                Subscribe →
              </button>
            </div>
          </div>
        </div>
        <div className="uf-heroOverlay" />
      </section>

      <section className="uf-sec uf-secCats">
        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
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

      <section className="uf-sec uf-secPick">
        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="uf-grid2">
            <div className="uf-noteBox">
              <div className="uf-boxTitle">Editor’s Note</div>
              <p className="uf-boxText">
                이 공간은 “매거진 소개글”처럼 고정해도 좋고,
                <br />
                나중에 Firestore config로 문구를 바꿀 수도 있어요.
              </p>
            </div>

            <div className="uf-pickBox">
              <div className="uf-boxTitle">Editor’s Pick</div>

              {pickLoading ? (
                <div className="uf-boxText">로딩 중… ⏳</div>
              ) : pickArticles.length === 0 ? (
                <div className="uf-boxText">
                  아직 Pick이 비어 있어요 🥲 <br />
                  Firestore config/editorPick 문서의 <b>picks</b> 배열에 글 id를 넣어주세요.
                </div>
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

      <section className="uf-sec uf-secArchive" ref={archiveRef}>
        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="uf-archiveLayout">
            <aside className="uf-archiveSide">
              <div className="uf-sideBox">
                <div className="uf-sideTitle">Archive</div>

                <button
                  type="button"
                  className={`uf-sideItem ${activeCat === "All" && !savedMode ? "is-active" : ""}`}
                  onClick={() => setQuery({ saved: "0", cat: "All", q: "", page: 1 })}
                >
                  All
                </button>

                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`uf-sideItem ${activeCat === c.key && !savedMode ? "is-active" : ""}`}
                    onClick={() => setQuery({ saved: "0", cat: c.key, q: "", page: 1 })}
                  >
                    {c.label}
                  </button>
                ))}

                <button type="button" className={`uf-sideItem ${savedMode ? "is-active" : ""}`} onClick={onClickSaved}>
                  Saved
                </button>
              </div>
            </aside>

            <div className="uf-archiveMain">
              <div className="uf-archiveTopbar">
                <div className="uf-sort">
                  <button type="button" className={`uf-chip ${sortBy === "latest" ? "is-active" : ""}`} onClick={() => setQuery({ sort: "latest", page: 1 })}>
                    최신순
                  </button>
                  <button type="button" className={`uf-chip ${sortBy === "popular" ? "is-active" : ""}`} onClick={() => setQuery({ sort: "popular", page: 1 })}>
                    인기순
                  </button>
                </div>

                <input className="uf-input uf-search" value={q} onChange={(e) => setQuery({ q: e.target.value, page: 1 })} placeholder="검색 (제목/요약/태그)" />
              </div>

              {loading ? (
                <div className="uf-empty">로딩 중… ⏳</div>
              ) : pageItems.length === 0 ? (
                <div className="uf-empty">아직 표시할 글이 없어요 🥲</div>
              ) : (
                <div className="uf-cards">
                  {pageItems.map((a) => {
                    const id = Number(a.id);
                    const saved = savedIds.includes(id);
                    const cover = a.coverMedium || a.coverThumb || a.cover || "";

                    return (
                      <article key={id} className="uf-card" onClick={() => openArticle(id)}>
                        <div className="uf-cardImg" style={{ backgroundImage: cover ? `url(${cover})` : "none" }}>
                          {!cover && <div className="uf-cardImg__fallback">No Image</div>}
                        </div>

                        <div className="uf-cardBody">
                          <div className="uf-cardMeta">
                            <span className="uf-badge">{a.category || "Category"}</span>
                            <span className="uf-date">{formatDate(a.createdAt)}</span>
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
                                    setQuery({ saved: "0", cat: "All", q: t, page: 1 });
                                  }}
                                >
                                  #{t}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="uf-cardBottom">
                            <div className="uf-stats">
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

              {filtered.length > PAGE_SIZE && (
                <div className="uf-pager">
                  <button className="uf-pagerBtn" type="button" disabled={safePage <= 1} onClick={() => goPage(safePage - 1)}>
                    ← Prev
                  </button>

                  <div className="uf-pagerNums">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} type="button" className={`uf-pagerNum ${p === safePage ? "is-active" : ""}`} onClick={() => goPage(p)}>
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button className="uf-pagerBtn" type="button" disabled={safePage >= totalPages} onClick={() => goPage(safePage + 1)}>
                    Next →
                  </button>
                </div>
              )}

              <div className="uf-moreHint">📌 글이 많아지면: 번호 페이지 / 더보기 / 무한스크롤로 확장 가능</div>
            </div>
          </div>
        </div>
      </section>

      <section className="uf-sec uf-secSubscribe" ref={subscribeRef}>
        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="uf-subBig">
            <h2 className="uf-subBigTitle">Subscribe</h2>
            <p className="uf-subBigDesc">
              새로운 글이 올라오면 놓치지 않게 알려드릴게요.
              <br />
              (지금은 UI만, 추후 실제 연동 예정)
            </p>
            <div className="uf-subBigRow">
              <input className="uf-input" placeholder="email@example.com" />
              <button className="uf-btn uf-btn--primary" type="button">Join</button>
            </div>
            <div className="uf-subBigFine">* 언제든지 구독 해지 가능</div>
          </div>
        </div>
      </section>

      <footer className="uf-footer">
        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="uf-footerRow">
            <div>© UNFRAME MAG</div>
            <div style={{ opacity: 0.7 }}>Made with ♥</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
