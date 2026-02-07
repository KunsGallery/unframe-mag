// src/pages/ListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { go, getParam } from "../utils/router";

// ✅ bookmarks (로컬)
import { getSavedIds, toggleSaved, onSavedChanged } from "../services/bookmarks";

// ✅ Editor’s Pick config
// ⚠️ Netlify 빌드에서 "not exported"가 났던 적이 있어서, config.js에서 실제 export 확인 필요.
//    그래도 여기서는 try/catch로 방어(없어도 앱 안 터지게)
import { getEditorPickIds } from "../services/config";

// ✅ articles 서비스
import { getPublishedArticles } from "../services/articles";

/* ============================================================================
  ✅ 커스터마이징 포인트(전역 상수)
============================================================================ */
const MAX_WIDTH = 1200; // ✅ 섹션 내부 컨텐츠 최대 가로폭(px)
const PAGE_SIZE = 6;    // ✅ 섹션5 아티클 리스트에 한 페이지당 보여줄 개수

// ✅ Hero 이미지
// ⚠️ Unsplash는 가끔 특정 파라미터/환경에서 404 또는 Firefox의 차단 경고가 보일 수 있어요.
//    - (해결1) URL에 ixlib 파라미터를 추가
//    - (해결2) 차라리 네가 소유한 이미지(ImgBB/자체 호스팅)로 교체
const HERO_BG =
  "https://images.unsplash.com/photo-1520697222865-7e1da6a5f03c?auto=format&fit=crop&w=2400&q=80&ixlib=rb-4.0.3";

// ✅ 카테고리 4개 (Editor에서 저장하는 category 값과 “완전히 동일”해야 필터가 먹음)
const CATEGORIES = [
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01" },
  { key: "Project", label: "Project", sub: "CATEGORY 02" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03" },
  { key: "News", label: "News", sub: "CATEGORY 04" },
];

/* ============================================================================
  ✅ 유틸 함수
============================================================================ */

// 날짜 출력 (createdAt이 Timestamp/number/string 어떤 형태든 최대한 안전하게 처리)
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

// 글 요약 줄이기
function clampText(s, n = 120) {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/* ============================================================================
  ✅ URL 파라미터를 상태로 반영 / 상태를 URL로 반영하기 위한 작은 헬퍼들
  - “카테고리 눌렀는데 새로고침” 같은 느낌은 보통:
    1) <a href> 사용 / window.location.href 사용
    2) URL 바뀌면서 상태가 다시 초기화
    3) popstate 처리 안함
  - 그래서 “URL ↔ 상태 동기화”를 여기서 확실히 잡습니다.
============================================================================ */

// 안전하게 숫자 파싱
function toPosInt(v, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// URL에 반영할 파라미터를 한 번에 만들어 go()로 pushState
function buildListUrl({ page, cat, sort, q, saved }) {
  const params = new URLSearchParams();
  params.set("mode", "list");
  params.set("page", String(page || 1));
  if (cat && cat !== "All") params.set("cat", cat);
  if (sort && sort !== "latest") params.set("sort", sort); // 기본 latest
  if (q && q.trim()) params.set("q", q.trim());
  if (saved) params.set("saved", "1");
  return `?${params.toString()}`;
}

// URL 파라미터에서 상태값 읽어오기
function readListStateFromUrl() {
  const page = toPosInt(getParam("page"), 1);
  const cat = getParam("cat") || "All";
  const sort = getParam("sort") || "latest"; // latest | popular
  const q = getParam("q") || "";
  const saved = getParam("saved") === "1";
  return { page, cat, sort, q, saved };
}

export default function ListPage({ theme, toggleTheme }) {
  /* ============================================================================
    ✅ 섹션 스크롤 대상 (ref + id 함께 사용하는 방식)
    - ref: React에서 직접 scrollIntoView
    - id : 메뉴에서 getElementById로도 이동 가능 (추후 확장 쉬움)
  ============================================================================ */
  const archiveRef = useRef(null);
  const subscribeRef = useRef(null);

  /* ============================================================================
    ✅ 데이터 상태
  ============================================================================ */
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Editor’s Pick ids (Firestore config)
  const [pickIds, setPickIds] = useState([]);
  const [pickLoading, setPickLoading] = useState(true);

  /* ============================================================================
    ✅ 필터/정렬/검색/저장/페이지 상태
    - “초기값”은 URL에서 읽어오는 것으로 통일
  ============================================================================ */
  const initial = useMemo(() => readListStateFromUrl(), []);
  const [activeCat, setActiveCat] = useState(initial.cat);
  const [sortBy, setSortBy] = useState(initial.sort);
  const [q, setQ] = useState(initial.q);
  const [savedMode, setSavedMode] = useState(initial.saved);
  const [page, setPage] = useState(initial.page);

  // ✅ Saved ids (localStorage 기반)
  const [savedIds, setSavedIds] = useState(() => getSavedIds());

  // ✅ 다른 탭에서 Saved 변경 감지(동기화)
  useEffect(() => {
    const off = onSavedChanged((ids) => setSavedIds(ids));
    return off;
  }, []);

  /* ============================================================================
    ✅ popstate(뒤로/앞으로) 처리
    - go()가 pushState로 URL만 바꿀 때, 컴포넌트는 “자동으로” 상태 갱신이 안됨
    - 그래서 popstate 이벤트를 듣고 URL 상태를 다시 읽어서 setState 해줌
  ============================================================================ */
  useEffect(() => {
    const onPop = () => {
      const next = readListStateFromUrl();
      setActiveCat(next.cat);
      setSortBy(next.sort);
      setQ(next.q);
      setSavedMode(next.saved);
      setPage(next.page);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ============================================================================
    ✅ (1) published 글 목록 불러오기
  ============================================================================ */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const list = await getPublishedArticles();
        if (!alive) return;
        setAll(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("[ListPage] getPublishedArticles failed:", e);
        setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ============================================================================
    ✅ (2) Editor’s Pick ids 불러오기
    - config.js export가 없을 수도 있어서 try/catch + 타입 체크로 방어
  ============================================================================ */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPickLoading(true);
        const ids = await getEditorPickIds(); // 예: [101, 99, 3]
        if (!alive) return;
        setPickIds(Array.isArray(ids) ? ids.map((x) => Number(x)).filter(Boolean) : []);
      } catch (e) {
        console.warn("[ListPage] getEditorPickIds unavailable or failed:", e);
        setPickIds([]);
      } finally {
        if (alive) setPickLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ============================================================================
    ✅ 필터/정렬: all → filtered
    - savedMode / category / search / sort 적용
  ============================================================================ */
  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    let list = [...all];

    // ✅ saved 모드: 저장된 id만 추림
    if (savedMode) {
      list = list.filter((a) => savedIds.includes(Number(a.id)));
    }

    // ✅ category 필터
    if (activeCat !== "All") {
      list = list.filter((a) => a.category === activeCat);
    }

    // ✅ search: title + excerpt + tags
    if (keyword) {
      list = list.filter((a) => {
        const t = String(a.title || "").toLowerCase();
        const e = String(a.excerpt || "").toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
        return t.includes(keyword) || e.includes(keyword) || tags.includes(keyword);
      });
    }

    // ✅ sort
    if (sortBy === "popular") {
      // (좋아요+조회수) 합산 기준
      list.sort(
        (x, y) =>
          Number(y.likes || 0) +
          Number(y.views || 0) -
          (Number(x.likes || 0) + Number(x.views || 0))
      );
    } else {
      // 최신순 (createdAt 우선)
      list.sort((x, y) => {
        const ax =
          x.createdAt?.toMillis?.() ??
          x.createdAt?.seconds?.() * 1000 ??
          Number(x.createdAt || 0);

        const ay =
          y.createdAt?.toMillis?.() ??
          y.createdAt?.seconds?.() * 1000 ??
          Number(y.createdAt || 0);

        return ay - ax;
      });
    }

    return list;
  }, [all, activeCat, sortBy, q, savedIds, savedMode]);

  /* ============================================================================
    ✅ 페이지네이션 계산
  ============================================================================ */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);

  // page가 범위 밖이면 자동 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  // 현재 페이지 데이터 슬라이스
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  /* ============================================================================
    ✅ Editor’s Pick 실제 글 데이터 구성
    - pickIds는 숫자 id 배열이므로 all에서 id로 매칭
  ============================================================================ */
  const pickArticles = useMemo(() => {
    if (!pickIds.length) return [];
    const map = new Map(all.map((a) => [Number(a.id), a]));
    return pickIds.map((id) => map.get(Number(id))).filter(Boolean);
  }, [all, pickIds]);

  /* ============================================================================
    ✅ 스크롤 이동 (ref 기반)
  ============================================================================ */
  function scrollTo(ref) {
    const el = ref?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ============================================================================
    ✅ URL 반영 헬퍼
    - 상태를 바꿀 때는 “setState + go(URL)”를 함께 해서
      새로고침 없이 주소만 바뀌고, 뒤로/앞으로도 자연스럽게 작동하게 함
  ============================================================================ */
  function syncUrl(next) {
    const url = buildListUrl(next);
    go(url); // ✅ pushState 기반이면 새로고침 안 됨
  }

  // ✅ 카테고리 버튼(섹션2) 클릭
  function onClickCategory(catKey) {
    // saved 모드 해제 + 카테고리 적용
    setSavedMode(false);
    setActiveCat(catKey);
    setSortBy("latest");
    setQ("");
    setPage(1);

    // ✅ URL 반영
    syncUrl({ page: 1, cat: catKey, sort: "latest", q: "", saved: false });

    // ✅ 섹션5로 이동
    scrollTo(archiveRef);
  }

  // ✅ Saved 눌렀을 때
  function onClickSaved() {
    setSavedMode(true);
    setActiveCat("All");
    setSortBy("latest");
    setQ("");
    setPage(1);

    syncUrl({ page: 1, cat: "All", sort: "latest", q: "", saved: true });
    scrollTo(archiveRef);
  }

  // ✅ 페이지 이동 (현재 필터/정렬/검색/저장 상태를 URL에도 함께 반영)
  function setPageAndUrl(nextPage) {
    const p = Math.max(1, Math.min(totalPages, nextPage));
    setPage(p);
    syncUrl({ page: p, cat: activeCat, sort: sortBy, q, saved: savedMode });
  }

  // ✅ 정렬 변경
  function setSortAndUrl(nextSort) {
    setSortBy(nextSort);
    setPage(1);
    syncUrl({ page: 1, cat: activeCat, sort: nextSort, q, saved: savedMode });
  }

  // ✅ 검색 변경 (키 입력 시 계속 pushState 하면 히스토리가 너무 쌓임)
  //    -> 여기서는 “즉시” 반영하되, 원하면 debounce로 바꿀 수 있어요.
  function setQueryAndUrl(nextQ) {
    setQ(nextQ);
    setPage(1);
    syncUrl({ page: 1, cat: activeCat, sort: sortBy, q: nextQ, saved: savedMode });
  }

  // ✅ 좌측 사이드바 카테고리 클릭(섹션5 내부)
  function setCategoryFromSidebar(catKey) {
    setSavedMode(false);
    setActiveCat(catKey);
    setPage(1);
    // 검색은 유지할지/지울지 취향인데, 지금은 “유지”로 해둠
    // 검색을 지우고 싶으면: setQ(""); q: ""
    syncUrl({ page: 1, cat: catKey, sort: sortBy, q, saved: false });
  }

  return (
    <div className="u-listRoot">
      {/* =========================================================================
        ✅ Top Nav
        - 버튼들은 반드시 type="button" 지정(예상치 못한 submit/리로드 방지)
        - 브랜드 클릭은 list로 복귀
      ========================================================================= */}
      <div className="u-topNav">
        <div className="u-topNav__inner" style={{ maxWidth: MAX_WIDTH }}>
          {/* ✅ div 대신 button으로 바꿔도 좋음(접근성). 지금은 네 스타일 유지 */}
          <div className="u-brand" role="button" tabIndex={0} onClick={() => go(buildListUrl({ page: 1 }))}>
            U#
          </div>

          <div className="u-navRight">
            <a className="u-navLink" href="https://unframe.imweb.me" target="_blank" rel="noreferrer">
              Back UNFRAME
            </a>

            <button type="button" className="u-navLinkBtn" onClick={() => scrollTo(archiveRef)}>
              Archive
            </button>

            <button type="button" className="u-navLinkBtn" onClick={() => scrollTo(subscribeRef)}>
              Subscription
            </button>

            <button
              type="button"
              className="u-navLinkBtn u-navLinkBtn--saved"
              onClick={onClickSaved}
              title="내 기기(브라우저)에 저장된 북마크 목록"
            >
              Saved ({savedIds.length})
            </button>

            {/* ✅ 테마 토글 */}
            <button type="button" className="u-navLinkBtn" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
        ✅ Section 1: Hero
        - backgroundImage는 네가 소유한 이미지로 교체 추천(안정성↑)
      ========================================================================= */}
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
              <button type="button" className="u-btn u-btnPrimary" onClick={() => scrollTo(archiveRef)}>
                Archive 보기 →
              </button>
              <button type="button" className="u-btn u-btnGhost" onClick={() => scrollTo(subscribeRef)}>
                Subscribe →
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 오버레이(어두운 레이어). 텍스트 가독성 조절용 */}
        <div className="u-heroOverlay" />
      </section>

      {/* =========================================================================
        ✅ Section 2: Categories interactive
        - 버튼 hover 애니메이션/폭 변화는 CSS에서 처리
        - 클릭 시: cat 적용 + 섹션5로 스크롤
      ========================================================================= */}
      <section className="u-sec u-secCats">
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-catsRow">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className="u-catCard"
                onClick={() => onClickCategory(c.key)}
              >
                <div className="u-catSub">{c.sub}</div>
                <div className="u-catTitle">{c.label}</div>
                <div className="u-catHint">VIEW GALLERY →</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
        ✅ Section 3: Marquee + mini subscribe
        - 이메일 저장/연동은 추후(지금은 UI만)
      ========================================================================= */}
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
              <button type="button" className="u-btn u-btnPrimary" onClick={() => scrollTo(subscribeRef)}>
                Subscribe
              </button>
            </div>
            <div className="u-miniSub__desc">* 지금은 UI만, 추후 실제 연동 예정 ✨</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
        ✅ Section 4: Editor’s Note + Editor’s Pick
        - pickIds는 config에서 가져오고 all과 매칭해서 보여줌
      ========================================================================= */}
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
                    <button
                      key={a.id}
                      type="button"
                      className="u-pickItem"
                      onClick={() => go(`?mode=view&id=${Number(a.id)}`)} // ✅ 반드시 숫자 id로 이동!
                    >
                      <span className="u-pickBadge">PICK</span>
                      <span className="u-pickTitle">{a.title || "(no title)"}</span>
                      <span className="u-pickMeta">
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

      {/* =========================================================================
        ✅ Section 5: Archive + Pagination
        - id="archive"를 같이 달아두면, 상단 메뉴에서 id 기반 스크롤도 가능
        - 좌측 aside는 sticky 스타일로 CSS에서 처리
      ========================================================================= */}
      <section className="u-sec u-secArchive" id="archive" ref={archiveRef}>
        <div className="u-secInner" style={{ maxWidth: MAX_WIDTH }}>
          <div className="u-archiveLayout">
            {/* Left sticky */}
            <aside className="u-archiveSide">
              <div className="u-sideBox">
                <div className="u-sideTitle">Archive</div>

                <button
                  type="button"
                  className={`u-sideItem ${activeCat === "All" && !savedMode ? "is-active" : ""}`}
                  onClick={() => {
                    setSavedMode(false);
                    setActiveCat("All");
                    setPageAndUrl(1);
                  }}
                >
                  All
                </button>

                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`u-sideItem ${activeCat === c.key && !savedMode ? "is-active" : ""}`}
                    onClick={() => setCategoryFromSidebar(c.key)}
                  >
                    {c.label}
                  </button>
                ))}

                <button
                  type="button"
                  className={`u-sideItem ${savedMode ? "is-active" : ""}`}
                  onClick={onClickSaved}
                >
                  Saved
                </button>
              </div>
            </aside>

            {/* Right list */}
            <div className="u-archiveMain">
              {/* 상단 컨트롤 바: 정렬 + 검색 */}
              <div className="u-archiveTopbar">
                <div className="u-sort">
                  <button
                    type="button"
                    className={`u-chip ${sortBy === "latest" ? "is-active" : ""}`}
                    onClick={() => setSortAndUrl("latest")}
                  >
                    최신순
                  </button>

                  <button
                    type="button"
                    className={`u-chip ${sortBy === "popular" ? "is-active" : ""}`}
                    onClick={() => setSortAndUrl("popular")}
                  >
                    인기순
                  </button>
                </div>

                <input
                  className="u-input u-search"
                  value={q}
                  onChange={(e) => setQueryAndUrl(e.target.value)}
                  placeholder="검색 (제목/요약/태그)"
                />
              </div>

              {/* 리스트 본문 */}
              {loading ? (
                <div className="u-empty">로딩 중… ⏳</div>
              ) : pageItems.length === 0 ? (
                <div className="u-empty">아직 표시할 글이 없어요 🥲</div>
              ) : (
                <div className="u-cards">
                  {pageItems.map((a) => {
                    // ✅ 중요: view로 이동할 id는 반드시 a.id(숫자)로 통일
                    const id = Number(a.id);
                    const saved = savedIds.includes(id);

                    // ✅ 커버는 가능한 중간 사이즈 우선(리스트 품질용)
                    //    - coverMedium / coverThumb / cover 순서로 fallback
                    const cover = a.coverMedium || a.coverThumb || a.cover || "";

                    return (
                      <article
                        key={id}
                        className="u-card"
                        onClick={() => go(`?mode=view&id=${id}`)} // ✅ 여기 틀리면 "글을 찾을 수 없음" 발생
                      >
                        <div
                          className="u-cardImg"
                          style={{ backgroundImage: cover ? `url(${cover})` : "none" }}
                        >
                          {!cover && <div className="u-cardImg__fallback">No Image</div>}
                        </div>

                        <div className="u-cardBody">
                          <div className="u-cardMeta">
                            <span className="u-badge">{a.category || "Category"}</span>
                            <span className="u-date">{formatDate(a.createdAt)}</span>
                          </div>

                          <div className="u-cardTitle">{a.title || "(no title)"}</div>
                          <div className="u-cardExcerpt">{clampText(a.excerpt || "", 120)}</div>

                          {/* ✅ 태그는 카드 아래에만 */}
                          {Array.isArray(a.tags) && a.tags.length > 0 && (
                            <div className="u-tags">
                              {a.tags.slice(0, 4).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  className="u-tag"
                                  onClick={(ev) => {
                                    // ✅ 카드 클릭(뷰 이동) 방지
                                    ev.stopPropagation();
                                    // ✅ 태그 클릭 시: 검색어로 세팅
                                    setSavedMode(false);
                                    setActiveCat("All");
                                    setQueryAndUrl(String(t)); // URL까지 반영
                                  }}
                                  title={`태그 검색: ${t}`}
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
                              type="button"
                              className={`u-saveBtn ${saved ? "is-saved" : ""}`}
                              onClick={(ev) => {
                                // ✅ 카드 클릭(뷰 이동) 방지
                                ev.stopPropagation();
                                const r = toggleSaved(id);
                                setSavedIds(r.ids); // 즉시 UI 반영
                              }}
                              title="이 기기에만 저장되는 북마크"
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
                  <button
                    type="button"
                    className="u-pagerBtn"
                    disabled={page <= 1}
                    onClick={() => setPageAndUrl(page - 1)}
                  >
                    ← Prev
                  </button>

                  <div className="u-pagerNums">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          type="button"
                          className={`u-pagerNum ${p === page ? "is-active" : ""}`}
                          onClick={() => setPageAndUrl(p)}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="u-pagerBtn"
                    disabled={page >= totalPages}
                    onClick={() => setPageAndUrl(page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* ✅ 확장 아이디어 힌트 */}
              <div className="u-moreHint">
                📌 글이 아주 많아지면 “커서 기반 페이지네이션(무한 로딩)”도 가능해요. 지금은 안정적인 번호 페이지 방식 👍
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
        ✅ Section 6: Subscription
        - id="subscribe" 추가해 두면 메뉴에서 id 기반 이동도 쉬움
      ========================================================================= */}
      <section className="u-sec u-secSubscribe" id="subscribe" ref={subscribeRef}>
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
              <button type="button" className="u-btn u-btnPrimary">
                Join
              </button>
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
