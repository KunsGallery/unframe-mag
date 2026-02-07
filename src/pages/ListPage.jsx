// src/pages/ListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { go, getParam } from "../utils/router";

// ✅ bookmarks (로컬)
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";

// ✅ Editor’s Pick config
import { getEditorPickIds } from "../services/config";

// ✅ articles 서비스 (프로젝트에 맞는 함수로 필요 시 이름 수정)
import { getPublishedArticles } from "../services/articles"; 
// ⚠️ 만약 listPublishedArticles / getArticlesPublished 등 이름이 다르면 여기만 바꿔주세요.

const MAX_WIDTH = 1200;
const PAGE_SIZE = 6;

// ✅ Hero 이미지 (원하는 이미지로 교체)
const HERO_BG =
  "https://images.unsplash.com/photo-1520697222865-7e1da6a5f03c?auto=format&fit=crop&w=2400&q=80";

// ✅ 카테고리 4개
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
  const archiveRef = useRef(null);
  const subscribeRef = useRef(null);

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Editor’s Pick ids (Firestore config)
  const [pickIds, setPickIds] = useState([]);
  const [pickLoading, setPickLoading] = useState(true);

  // ✅ 필터/정렬/검색
  const [activeCat, setActiveCat] = useState("All");
  const [sortBy, setSortBy] = useState("latest"); // latest | popular
  const [q, setQ] = useState("");

  // ✅ Saved
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const [savedMode, setSavedMode] = useState(false);

  // ✅ 페이지네이션
  const initialPage = Number(getParam("page") || 1);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);

  // 다른 탭에서 Saved 변경 감지
  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  // ✅ (1) published 글 목록 불러오기
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const list = await getPublishedArticles(); // ⚠️ 함수명 다르면 여기만 수정!
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

  // ✅ (2) Editor’s Pick ids 불러오기
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPickLoading(true);
        const ids = await getEditorPickIds();
        if (!alive) return;
        setPickIds(ids);
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

  // ✅ 전체 리스트 → 필터/정렬
  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    let list = [...all];

    // saved 모드
    if (savedMode) {
      list = list.filter((a) => savedIds.includes(Number(a.id)));
    }

    // category
    if (activeCat !== "All") {
      list = list.filter((a) => a.category === activeCat);
    }

    // search: title + excerpt + tags
    if (keyword) {
      list = list.filter((a) => {
        const t = String(a.title || "").toLowerCase();
        const e = String(a.excerpt || "").toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
        return t.includes(keyword) || e.includes(keyword) || tags.includes(keyword);
      });
    }

    // sort
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
        const ax = x.createdAt?.toMillis?.() ?? x.createdAt?.seconds?.() * 1000 ?? Number(x.createdAt || 0);
        const ay = y.createdAt?.toMillis?.() ?? y.createdAt?.seconds?.() * 1000 ?? Number(y.createdAt || 0);
        return ay - ax;
      });
    }

    return list;
  }, [all, activeCat, sortBy, q, savedIds, savedMode]);

  // ✅ 페이지네이션 계산
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [filtered.length]);

  // ✅ page가 범위 밖이면 자동 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  // ✅ 현재 페이지 데이터 슬라이스
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // ✅ Editor’s Pick 실제 글 데이터 만들기
  const pickArticles = useMemo(() => {
    if (!pickIds.length) return [];
    const map = new Map(all.map((a) => [Number(a.id), a]));
    return pickIds.map((id) => map.get(id)).filter(Boolean);
  }, [all, pickIds]);

  function scrollTo(ref) {
    const el = ref?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onClickCategory(catKey) {
    setSavedMode(false);
    setActiveCat(catKey);
    setSortBy("latest");
    setQ("");
    setPage(1);

    // ✅ 섹션5로 이동
    scrollTo(archiveRef);
  }

  function onClickSaved() {
    setSavedMode(true);
    setActiveCat("All");
    setSortBy("latest");
    setQ("");
    setPage(1);

    scrollTo(archiveRef);
  }

  // ✅ page를 URL에도 반영하고 싶어서 go 사용
  function setPageAndUrl(nextPage) {
    const p = Math.max(1, Math.min(totalPages, nextPage));
    setPage(p);
    go(`?mode=list&page=${p}`);
  }

  return (
    <div className="u-listRoot">
      {/* ✅ Top Nav */}
      <div className="u-topNav">
        <div className="u-topNav__inner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-brand" onClick={() => go("?mode=list")}>U#</div>

          <div className="u-navRight">
            <a className="u-navLink" href="https://unframe.imweb.me" target="_blank" rel="noreferrer">
              Back UNFRAME
            </a>

            <button className="u-navLinkBtn" onClick={() => scrollTo(archiveRef)}>Archive</button>
            <button className="u-navLinkBtn" onClick={() => scrollTo(subscribeRef)}>Subscription</button>

            <button className="u-navLinkBtn u-navLinkBtn--saved" onClick={onClickSaved}>
              Saved ({savedIds.length})
            </button>

            {/* ✅ 테마 토글 */}
            <button className="u-navLinkBtn" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Section 1: Hero */}
      <section className="u-sec u-hero" style={{ backgroundImage: `url(${HERO_BG})` }}>
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-heroCard">
            <div className="u-heroKicker">UNFRAME MAGAZINE</div>
            <h1 className="u-heroTitle">Any Letter That Inspires You.</h1>
            <p className="u-heroSub">
              오늘의 전시 · 프로젝트 · 아티스트 노트 · 뉴스.
              <br />
              부담 없이, 하지만 깊게—당신의 아트 감각을 업데이트해요.
            </p>

            <div className="u-heroBtns">
              <button className="u-btn u-btnPrimary" onClick={() => scrollTo(archiveRef)}>
                Archive 보기 →
              </button>
              <button className="u-btn u-btnGhost" onClick={() => scrollTo(subscribeRef)}>
                Subscribe →
              </button>
            </div>
          </div>
        </div>
        <div className="u-heroOverlay" />
      </section>

      {/* ✅ Section 2: Categories interactive */}
      <section className="u-sec u-secCats">
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-catsRow">
            {CATEGORIES.map((c) => (
              <button key={c.key} className="u-catCard" onClick={() => onClickCategory(c.key)}>
                <div className="u-catSub">{c.sub}</div>
                <div className="u-catTitle">{c.label}</div>
                <div className="u-catHint">VIEW GALLERY →</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ Section 3: Marquee + mini subscribe */}
      <section className="u-sec u-secMarquee">
        <div className="u-marquee">
          <div className="u-marquee__track">
            <span>UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS • </span>
            <span>UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS • </span>
            <span>UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS • </span>
          </div>
        </div>

        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-miniSub">
            <div className="u-miniSub__title">📮 구독하면 매주 좋은 글을 보내드려요</div>
            <div className="u-miniSub__row">
              <input className="u-input" placeholder="email@example.com" />
              <button className="u-btn u-btnPrimary" onClick={() => scrollTo(subscribeRef)}>
                Subscribe
              </button>
            </div>
            <div className="u-miniSub__desc">* 지금은 UI만, 추후 실제 연동 예정 ✨</div>
          </div>
        </div>
      </section>

      {/* ✅ Section 4: Editor’s Note + Editor’s Pick (Firestore config 연결) */}
      <section className="u-sec u-secPick">
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-grid2">
            {/* NOTE */}
            <div className="u-noteBox">
              <div className="u-boxTitle">Editor’s Note</div>
              <p className="u-boxText">
                이 섹션은 “고정 소개글” 느낌으로 운영하기 좋아요.
                <br />
                다음 단계에서 Firestore config로 noteText도 연결 가능!
              </p>
            </div>

            {/* PICK */}
            <div className="u-pickBox">
              <div className="u-boxTitle">Editor’s Pick</div>

              {pickLoading ? (
                <div className="u-boxText">로딩 중… ⏳</div>
              ) : pickArticles.length === 0 ? (
                <div className="u-boxText">
                  아직 Pick이 비어 있어요 🥲 <br />
                  Firestore config/editorPick 문서의 <b>picks</b> 배열에 글 id를 넣어주세요.
                </div>
              ) : (
                <div className="u-pickList">
                  {pickArticles.slice(0, 3).map((a) => (
                    <button key={a.id} className="u-pickItem" onClick={() => go(`?mode=view&id=${a.id}`)}>
                      <span className="u-pickBadge">PICK</span>
                      <span className="u-pickTitle">{a.title || "(no title)"}</span>
                      <span className="u-pickMeta">{a.category} · {formatDate(a.createdAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Section 5: Archive + Pagination */}
      <section className="u-sec u-secArchive" ref={archiveRef}>
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-archiveLayout">
            {/* Left sticky */}
            <aside className="u-archiveSide">
              <div className="u-sideBox">
                <div className="u-sideTitle">Archive</div>

                <button
                  className={`u-sideItem ${activeCat === "All" && !savedMode ? "is-active" : ""}`}
                  onClick={() => {
                    setSavedMode(false);
                    setActiveCat("All");
                    setQ("");
                    setPageAndUrl(1);
                  }}
                >
                  All
                </button>

                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    className={`u-sideItem ${activeCat === c.key && !savedMode ? "is-active" : ""}`}
                    onClick={() => {
                      setSavedMode(false);
                      setActiveCat(c.key);
                      setQ("");
                      setPageAndUrl(1);
                    }}
                  >
                    {c.label}
                  </button>
                ))}

                <button className={`u-sideItem ${savedMode ? "is-active" : ""}`} onClick={onClickSaved}>
                  Saved
                </button>
              </div>
            </aside>

            {/* Right list */}
            <div className="u-archiveMain">
              <div className="u-archiveTopbar">
                <div className="u-sort">
                  <button className={`u-chip ${sortBy === "latest" ? "is-active" : ""}`} onClick={() => { setSortBy("latest"); setPageAndUrl(1); }}>
                    최신순
                  </button>
                  <button className={`u-chip ${sortBy === "popular" ? "is-active" : ""}`} onClick={() => { setSortBy("popular"); setPageAndUrl(1); }}>
                    인기순
                  </button>
                </div>

                <input
                  className="u-input u-search"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPageAndUrl(1); }}
                  placeholder="검색 (제목/요약/태그)"
                />
              </div>

              {loading ? (
                <div className="u-empty">로딩 중… ⏳</div>
              ) : pageItems.length === 0 ? (
                <div className="u-empty">아직 표시할 글이 없어요 🥲</div>
              ) : (
                <div className="u-cards">
                  {pageItems.map((a) => {
                    const id = Number(a.id);
                    const saved = savedIds.includes(id);
                    const cover = a.coverMedium || a.coverThumb || a.cover || "";

                    return (
                      <article key={id} className="u-card" onClick={() => go(`?mode=view&id=${id}`)}>
                        <div className="u-cardImg" style={{ backgroundImage: cover ? `url(${cover})` : "none" }}>
                          {!cover && <div className="u-cardImg__fallback">No Image</div>}
                        </div>

                        <div className="u-cardBody">
                          <div className="u-cardMeta">
                            <span className="u-badge">{a.category || "Category"}</span>
                            <span className="u-date">{formatDate(a.createdAt)}</span>
                          </div>

                          <div className="u-cardTitle">{a.title || "(no title)"}</div>
                          <div className="u-cardExcerpt">{clampText(a.excerpt || "", 120)}</div>

                          {/* 태그는 카드 아래에만 */}
                          {Array.isArray(a.tags) && a.tags.length > 0 && (
                            <div className="u-tags">
                              {a.tags.slice(0, 4).map((t) => (
                                <button
                                  key={t}
                                  className="u-tag"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setSavedMode(false);
                                    setActiveCat("All");
                                    setQ(t);
                                    setPageAndUrl(1);
                                  }}
                                >
                                  #{t}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="u-cardBottom">
                            <div className="u-stats">
                              <span>👁 {Number(a.views || 0)}</span>
                              <span>💗 {Number(a.likes || 0)}</span>
                            </div>

                            <button
                              className={`u-saveBtn ${saved ? "is-saved" : ""}`}
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

              {/* ✅ 페이지네이션 UI */}
              {filtered.length > PAGE_SIZE && (
                <div className="u-pager">
                  <button className="u-pagerBtn" disabled={page <= 1} onClick={() => setPageAndUrl(page - 1)}>
                    ← Prev
                  </button>

                  <div className="u-pagerNums">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          className={`u-pagerNum ${p === page ? "is-active" : ""}`}
                          onClick={() => setPageAndUrl(p)}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button className="u-pagerBtn" disabled={page >= totalPages} onClick={() => setPageAndUrl(page + 1)}>
                    Next →
                  </button>
                </div>
              )}

              {/* ✅ 페이지네이션 확장 아이디어 */}
              <div className="u-moreHint">
                📌 글이 아주 많아지면 “커서 기반 페이지네이션(무한 로딩)”도 가능해요. 지금은 안정적인 번호 페이지 방식 👍
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Section 6: Subscription */}
      <section className="u-sec u-secSubscribe" ref={subscribeRef}>
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-subBig">
            <h2 className="u-subBigTitle">Subscribe</h2>
            <p className="u-subBigDesc">
              새로운 글이 올라오면 놓치지 않게 알려드릴게요.
              <br />
              (지금은 UI만, 추후 실제 연동 예정)
            </p>
            <div className="u-subBigRow">
              <input className="u-input" placeholder="email@example.com" />
              <button className="u-btn u-btnPrimary">Join</button>
            </div>
            <div className="u-subBigFine">* 언제든지 구독 해지 가능</div>
          </div>
        </div>
      </section>

      {/* ✅ Footer */}
      <footer className="u-footer">
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-footerRow">
            <div>© UNFRAME MAG</div>
            <div style={{ opacity: 0.7 }}>Made with ♥</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
