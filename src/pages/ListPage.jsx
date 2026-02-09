// src/pages/ListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/** ✅ bookmarks (로컬) */
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";

/** ✅ Editor’s Pick config */
import { getEditorPickIds } from "../services/config";

/** ✅ published 글만 가져오기 */
import { getPublishedArticles } from "../services/articles";

/* =============================================================================
  ✅ 레이아웃 상수
  - 숫자만 바꾸면 전체 밸런스가 같이 변합니다.
============================================================================= */
const MAX_WIDTH = 1200; // ✅ 섹션 컨텐츠 최대 폭
const PAGE_SIZE = 6;    // ✅ 아카이브 섹션에서 한 페이지에 보여줄 카드 수

/* =============================================================================
  ✅ Hero 배경
  - 가장 안정적인 방법은 /public/hero.jpg 를 쓰는 것
  - (외부 링크는 광고차단/추적방지 등에 의해 로딩 경고가 날 수 있음)
============================================================================= */
const HERO_BG = "/hero.jpg";

/* =============================================================================
  ✅ 카테고리 4개 (프로젝트 고정)
============================================================================= */
const CATEGORIES = [
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01" },
  { key: "Project", label: "Project", sub: "CATEGORY 02" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03" },
  { key: "News", label: "News", sub: "CATEGORY 04" },
];

/* =============================================================================
  ✅ util: 날짜 포맷
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
  ✅ util: 텍스트 줄임
============================================================================= */
function clampText(s, n = 120) {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/* =============================================================================
  ✅ Reading time
  - HTML에서 텍스트만 뽑아서 대략 분(min) 계산
  - 한국어 기준 근사치로 "1분당 900자" 가정 (원하면 숫자만 바꾸면 됨)
============================================================================= */
function estimateReadMinutesFromHTML(html) {
  const plain = String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const chars = plain.length;
  const charsPerMin = 900; // ✅ 여기만 조절하면 전체 read time 성향이 바뀜
  const mins = Math.max(1, Math.round(chars / charsPerMin));
  return mins;
}

export default function ListPage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /** ✅ 섹션 스크롤용 ref */
  const archiveRef = useRef(null);
  const subscribeRef = useRef(null);

  /** ✅ 데이터 */
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  /** ✅ Editor’s Pick ids */
  const [pickIds, setPickIds] = useState([]);
  const [pickLoading, setPickLoading] = useState(true);

  /** ✅ Saved */
  const [savedIds, setSavedIds] = useState(() => getSavedIds());
  const [savedMode, setSavedMode] = useState(false);

  /* =============================================================================
    ✅ URL query 상태 (필터/정렬/검색/페이지)
    - URL과 UI를 동기화해서 "뒤로가기/공유/새로고침"에 강함
  ============================================================================= */
  const activeCat = searchParams.get("cat") || "All";    // All | Exhibition | ...
  const sortBy = searchParams.get("sort") || "latest";   // latest | popular
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);

  /** ✅ 다른 탭에서 Saved 변경 감지 */
  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  /* =============================================================================
    ✅ (1) published 글만 불러오기
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
    ✅ (2) Editor’s Pick ids 불러오기
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
    ✅ URL query 업데이트 helper
    - 필요한 것만 덮어써서 UX가 안정적
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
    ✅ 섹션 스크롤
  ============================================================================= */
  function scrollTo(ref) {
    const el = ref?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* =============================================================================
    ✅ 필터/정렬 적용된 전체 리스트
  ============================================================================= */
  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    let list = [...all];

    // (A) Saved 모드
    if (savedMode) list = list.filter((a) => savedIds.includes(Number(a.id)));

    // (B) Category
    if (activeCat !== "All") list = list.filter((a) => a.category === activeCat);

    // (C) Search: title + excerpt + tags
    if (keyword) {
      list = list.filter((a) => {
        const t = String(a.title || "").toLowerCase();
        const e = String(a.excerpt || "").toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
        return t.includes(keyword) || e.includes(keyword) || tags.includes(keyword);
      });
    }

    // (D) Sort
    if (sortBy === "popular") {
      list.sort(
        (x, y) =>
          Number(y.likes || 0) +
          Number(y.views || 0) -
          (Number(x.likes || 0) + Number(x.views || 0))
      );
    } else {
      list.sort((x, y) => {
        const ax =
          x.createdAt?.toMillis?.() ??
          (x.createdAt?.seconds ? x.createdAt.seconds * 1000 : 0) ??
          Number(x.createdAt || 0);
        const ay =
          y.createdAt?.toMillis?.() ??
          (y.createdAt?.seconds ? y.createdAt.seconds * 1000 : 0) ??
          Number(y.createdAt || 0);
        return ay - ax;
      });
    }

    return list;
  }, [all, activeCat, sortBy, q, savedIds, savedMode]);

  /* =============================================================================
    ✅ 페이지네이션 계산
  ============================================================================= */
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  const pageItems = useMemo(() => {
    const safePage = Math.max(1, Math.min(totalPages, page));
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  /* =============================================================================
    ✅ Pick 글 데이터 매핑
  ============================================================================= */
  const pickArticles = useMemo(() => {
    if (!pickIds.length) return [];
    const map = new Map(all.map((a) => [Number(a.id), a]));
    return pickIds.map((id) => map.get(Number(id))).filter(Boolean);
  }, [all, pickIds]);

  /* =============================================================================
    ✅ 이벤트 핸들러들
  ============================================================================= */
  function onClickSaved() {
    setSavedMode(true);
    setQuery({ cat: "All", sort: "latest", q: "", page: 1 });
    scrollTo(archiveRef);
  }

  function onClickCategory(catKey) {
    setSavedMode(false);
    setQuery({ cat: catKey, sort: "latest", q: "", page: 1 });
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
      {/* =============================================================================
        ✅ Top Nav (sticky)
      ============================================================================= */}
      <header className="uf-topNav">
        <div className="uf-topNav__inner" style={{ maxWidth: MAX_WIDTH }}>
          <button className="uf-brand" type="button" onClick={() => navigate("/")}>
            U#
          </button>

          <nav className="uf-navRight">
            <a className="uf-navLink" href="https://unframe.kr" target="_blank" rel="noreferrer">
              Back UNFRAME
            </a>

            <button className="uf-navBtn" type="button" onClick={() => scrollTo(archiveRef)}>
              Archive
            </button>
            <button className="uf-navBtn" type="button" onClick={() => scrollTo(subscribeRef)}>
              Subscription
            </button>

            <button className="uf-navBtn uf-navBtn--saved" type="button" onClick={onClickSaved}>
              Saved ({savedIds.length})
            </button>

            <button className="uf-navBtn" type="button" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </nav>
        </div>
      </header>

      {/* =============================================================================
        ✅ Section 1: Hero (80vh 느낌은 CSS에서)
      ============================================================================= */}
      <section className="uf-sec uf-heroList" style={{ backgroundImage: `url(${HERO_BG})` }}>
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

      {/* =============================================================================
        ✅ Section 2: Categories (hover 인터랙션은 CSS에서)
      ============================================================================= */}
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

      {/* =============================================================================
        ✅ Section 3: Marquee + mini subscribe (UI만)
      ============================================================================= */}
      <section className="uf-sec uf-secMarquee">
        <div className="uf-marquee">
          <div className="uf-marquee__track">
            <span>UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS • </span>
            <span>UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS • </span>
            <span>UNFRAME • EXHIBITION • PROJECT • ARTIST NOTE • NEWS • </span>
          </div>
        </div>

        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="uf-miniSub">
            <div className="uf-miniSub__title">📮 구독하면 좋은 글을 보내드려요</div>
            <div className="uf-miniSub__row">
              <input className="uf-input" placeholder="email@example.com" />
              <button className="uf-btn uf-btn--primary" type="button" onClick={() => scrollTo(subscribeRef)}>
                Subscribe
              </button>
            </div>
            <div className="uf-miniSub__desc">* 지금은 UI만, 추후 실제 연동 예정 ✨</div>
          </div>
        </div>
      </section>

      {/* =============================================================================
        ✅ Section 4: Editor’s Note + Editor’s Pick
      ============================================================================= */}
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
                  {pickArticles.slice(0, 3).map((a) => {
                    const mins = estimateReadMinutesFromHTML(a.contentHTML || "");
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className="uf-pickItem"
                        onClick={() => openArticle(Number(a.id))}
                      >
                        <span className="uf-pickBadge">PICK</span>
                        <span className="uf-pickTitle">{a.title || "(no title)"}</span>
                        <span className="uf-pickMeta">
                          {a.category} · {formatDate(a.createdAt)} · ☕ {mins} min read
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================================
        ✅ Section 5: Archive (좌측 sticky + 우측 카드 + pagination)
      ============================================================================= */}
      <section className="uf-sec uf-secArchive" ref={archiveRef}>
        <div className="uf-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="uf-archiveLayout">
            {/* Left sticky */}
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

                <button type="button" className={`uf-sideItem ${savedMode ? "is-active" : ""}`} onClick={onClickSaved}>
                  Saved
                </button>
              </div>
            </aside>

            {/* Right list */}
            <div className="uf-archiveMain">
              <div className="uf-archiveTopbar">
                <div className="uf-sort">
                  <button
                    type="button"
                    className={`uf-chip ${sortBy === "latest" ? "is-active" : ""}`}
                    onClick={() => setQuery({ sort: "latest", page: 1 })}
                  >
                    최신순
                  </button>
                  <button
                    type="button"
                    className={`uf-chip ${sortBy === "popular" ? "is-active" : ""}`}
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
                    const mins = estimateReadMinutesFromHTML(a.contentHTML || "");

                    return (
                      <article key={id} className="uf-articleCard" onClick={() => openArticle(id)}>
                        <div className="uf-cardMedia">
                          <div className="uf-cardImg" style={{ backgroundImage: cover ? `url(${cover})` : "none" }}>
                            {!cover && <div className="uf-cardImg__fallback">No Image</div>}
                          </div>
                        </div>

                        <div className="uf-cardBody">
                          <div className="uf-cardTop">
                            <div className="uf-cardMeta">
                              <span className="uf-badge">{a.category || "Category"}</span>
                              <span className="uf-date">{formatDate(a.createdAt)}</span>
                              <span className="uf-read">☕ {mins} min read</span>
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
                              {saved ? "★" : "☆"}
                            </button>
                          </div>

                          <div className="uf-cardTitle">{a.title || "(no title)"}</div>
                          <div className="uf-cardExcerpt">{clampText(a.excerpt || "", 130)}</div>

                          {/* 태그는 카드 아래에만 */}
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
                              <span>👁 {Number(a.views || 0)}</span>
                              <span>💗 {Number(a.likes || 0)}</span>
                            </div>

                            <button className="uf-cardCta" type="button">
                              Read →
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
                  <button className="uf-pagerBtn" type="button" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                    ← Prev
                  </button>

                  <div className="uf-pagerNums">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          type="button"
                          className={`uf-pagerNum ${p === page ? "is-active" : ""}`}
                          onClick={() => goPage(p)}
                        >
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

              <div className="uf-moreHint">
                📌 글이 많아지면: (1) 번호 페이지 유지 (2) 더보기 버튼 (3) 무한스크롤로 확장 가능해요.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================================
        ✅ Section 6: Subscribe
      ============================================================================= */}
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
              <button className="uf-btn uf-btn--primary" type="button">
                Join
              </button>
            </div>
            <div className="uf-subBigFine">* 언제든지 구독 해지 가능</div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
