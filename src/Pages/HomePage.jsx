import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Headphones,
  Pause,
  Play,
  Search,
} from "lucide-react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useHomeConfig } from "../hooks/useHomeConfig";
import { useNetworkConfig } from "../hooks/useNetworkConfig";
import { usePopularRollup } from "../hooks/usePopularRollup";
import { ARCHIVE_CATEGORIES } from "../constants/categories";
import { estimateReadMinutes } from "../lib/readingMeta";
import { getCoverImageUrl, getImageSrcSet } from "../lib/imageUrl";
import {
  buildHomeSelection,
  filterHomeArchive,
  positiveRankingItems,
} from "../lib/homeEditorial";
import "../styles/home-editorial.css";

const edition = (article) => String(article.editionNo || "").padStart(3, "0");
const articlePath = (article) => `/article/${article.editionNo}`;

function ArticleImage({
  article,
  priority = false,
  sizes = "(max-width: 520px) calc(100vw - 32px), (max-width: 800px) calc((100vw - 76px) / 2), (max-width: 1280px) 32vw, 450px",
}) {
  const [failedSource, setFailedSource] = useState(null);
  const src = getCoverImageUrl(article, { width: priority ? 1200 : 800 });
  return src && failedSource !== src ? (
    <img
      src={src}
      srcSet={getImageSrcSet(article.cover || src, [480, 800, 1200])}
      sizes={sizes}
      alt={article.title || ""}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setFailedSource(src)}
    />
  ) : (
    <div
      className="home-image-placeholder"
      role="img"
      aria-label={`${article.title || "기사"} 표지 이미지 없음`}
    >
      U# / {edition(article)}
    </div>
  );
}

function ArticleMeta({ article }) {
  return (
    <div className="home-meta">
      <span>{article.category}</span>
      <span>NO.{edition(article)}</span>
      <span>{estimateReadMinutes(article, { min: 2 })}분 읽기</span>
    </div>
  );
}

function Story({ article }) {
  return (
    <article className="home-story">
      <Link to={articlePath(article)} className="home-story-image">
        <ArticleImage article={article} />
      </Link>
      <ArticleMeta article={article} />
      <h3>
        <Link to={articlePath(article)}>{article.title}</Link>
      </h3>
      {(article.excerpt || article.subtitle) && (
        <p>{article.excerpt || article.subtitle}</p>
      )}
      <Link className="home-text-link" to={articlePath(article)}>
        기사 읽기 <ArrowUpRight size={16} />
      </Link>
    </article>
  );
}

function CoverStage({ stories }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const stage = useRef(null);
  const storyKey = stories.map((article) => article.editionNo).join("|");
  const current = stories[index % stories.length];
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (
      paused ||
      hovered ||
      focused ||
      reduced ||
      !visible ||
      stories.length < 2
    )
      return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((value) => (value + 1) % stories.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reduced, visible, stories.length, storyKey]);
  const select = (next) => {
    setPaused(true);
    setIndex((next + stories.length) % stories.length);
  };
  return (
    <section
      ref={stage}
      className="home-cover home-container"
      aria-label="대표 기사"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="home-cover-grid" key={current.editionNo}>
        <Link className="home-cover-image" to={articlePath(current)}>
          <ArticleImage
            article={current}
            priority
            sizes="(max-width: 800px) 100vw, 58vw"
          />
        </Link>
        <div className="home-cover-copy">
          <p className="home-kicker">
            COVER STORY /{" "}
            {String((index % stories.length) + 1).padStart(2, "0")}
          </p>
          <ArticleMeta article={current} />
          <h1>
            <Link to={articlePath(current)}>{current.title}</Link>
          </h1>
          <p className="home-deck">
            {current.excerpt || current.subtitle || ""}
          </p>
          {current.author && (
            <p className="home-byline">글 · {current.author}</p>
          )}
          <Link className="home-text-link" to={articlePath(current)}>
            이야기 읽기 <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      {stories.length > 1 && (
        <div className="home-cover-bottom">
          <div className="home-cover-tabs" aria-label="대표 기사 선택">
            {stories.map((article, position) => (
              <button
                type="button"
                key={article.editionNo}
                aria-pressed={index % stories.length === position}
                onClick={() => select(position)}
              >
                <span>NO.{edition(article)}</span>
                {article.title}
              </button>
            ))}
          </div>
          <div className="home-controls">
            <button
              type="button"
              aria-label="이전 대표 기사"
              title="이전 대표 기사"
              onClick={() => select(index - 1)}
            >
              <ArrowLeft size={18} />
            </button>
            {!reduced && (
              <button
                type="button"
                aria-label={paused ? "자동 전환 재생" : "자동 전환 일시정지"}
                title={paused ? "자동 전환 재생" : "자동 전환 일시정지"}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
            <button
              type="button"
              aria-label="다음 대표 기사"
              title="다음 대표 기사"
              onClick={() => select(index + 1)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RankingBoard({ title, rollup }) {
  const items = positiveRankingItems(rollup.items, rollup.metricUsed);
  return (
    <div className="home-board">
      <h3>{title}</h3>
      <p className="home-small">
        {rollup.metricUsed.includes("30d") ? "최근 30일" : "최근 7일"}
      </p>
      {rollup.loading ? (
        <p role="status">집계 불러오는 중…</p>
      ) : rollup.error ? (
        <p>
          집계를 불러오지 못했어요.{" "}
          <button
            type="button"
            className="home-text-link"
            onClick={rollup.refetch}
          >
            다시 시도
          </button>
        </p>
      ) : items.length ? (
        <ol>
          {items.map((article) => (
            <li key={article.docId || article.editionNo}>
              <Link to={articlePath(article)}>{article.title}</Link>
              <span>{Number(article[rollup.metricUsed]).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>아직 집계된 반응이 없어요. 첫 번째 반응을 남겨주세요.</p>
      )}
    </div>
  );
}

function ReaderBoard() {
  const [state, setState] = useState({
    loading: true,
    users: [],
    error: false,
  });
  useEffect(() => {
    let alive = true;
    getDocs(query(collection(db, "users"), orderBy("xp", "desc"), limit(10)))
      .then((snap) => {
        if (alive)
          setState({
            loading: false,
            users: snap.docs
              .map((entry) => ({ uid: entry.id, ...entry.data() }))
              .filter((user) => Number(user.xp) > 0),
            error: false,
          });
      })
      .catch(() => {
        if (alive) setState({ loading: false, users: [], error: true });
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="home-board">
      <h3>함께 읽는 사람들</h3>
      <p className="home-small">독자 활동 · XP</p>
      {state.loading ? (
        <p role="status">불러오는 중…</p>
      ) : state.error ? (
        <p>독자 활동을 불러오지 못했어요.</p>
      ) : state.users.length ? (
        <ol>
          {state.users.map((user) => (
            <li key={user.uid}>
              <span>{user.nickname || "U# 독자"}</span>
              <span>{Number(user.xp).toLocaleString()} XP</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>읽고, 공감하며 함께 기록을 쌓아가요.</p>
      )}
    </div>
  );
}

export default function HomePage({ isDarkMode, onToast }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("weekly");
  const { config } = useHomeConfig();
  const { config: network } = useNetworkConfig();
  const likes = usePopularRollup({ mode: period, sortBy: "likes", top: 5 });
  const views = usePopularRollup({ mode: period, sortBy: "views", top: 5 });
  useEffect(() => {
    let alive = true;
    getDocs(
      query(
        collection(db, "articles"),
        where("status", "==", "published"),
        orderBy("sortIndex", "desc"),
        limit(60),
      ),
    )
      .then((snap) => {
        if (alive)
          setArticles(
            snap.docs.map((entry) => ({ docId: entry.id, ...entry.data() })),
          );
      })
      .catch(() => {
        if (alive)
          setError("아카이브를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (error) onToast?.(error);
  }, [error, onToast]);
  const { covers, picks, reading } = useMemo(
    () => buildHomeSelection(articles, config),
    [articles, config],
  );
  const filtered = useMemo(
    () => filterHomeArchive(articles, category, search),
    [articles, category, search],
  );
  const themeStories = useMemo(() => {
    const selected = (network.featuredEditionNos || [])
      .map((id) =>
        articles.find((article) => String(article.editionNo) === String(id)),
      )
      .filter(Boolean);
    return (
      selected.length
        ? [
            ...new Map(
              selected.map((article) => [article.editionNo, article]),
            ).values(),
          ]
        : reading
    ).slice(0, 2);
  }, [articles, network.featuredEditionNos, reading]);
  const links = network.links || {};
  const projects = [
    { key: "playlist", title: "UP", copy: "전시를 듣는 또 하나의 방식" },
    {
      key: "podcast",
      title: "Umm..",
      copy: "창작자의 생각이 목소리로 남는 곳",
    },
    { key: "gallery", title: "Gallery", copy: "언프레임의 전시와 프로그램" },
    { key: "music", title: "Music", copy: "언프레임의 음악 프로젝트" },
  ].filter((project) => links[project.key]);
  if (loading)
    return (
      <div className="home-status" role="status">
        이야기를 불러오고 있어요…
      </div>
    );
  if (error)
    return (
      <div className="home-status" role="alert">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            setAttempt((value) => value + 1);
          }}
        >
          다시 시도
        </button>
      </div>
    );
  if (!articles.length)
    return (
      <div className="home-status">
        <h1>첫 번째 이야기를 준비하고 있습니다.</h1>
        <Link to="/about">U# 알아보기</Link>
      </div>
    );
  return (
    <div
      className="home-editorial"
      data-home-theme={isDarkMode ? "dark" : "light"}
    >
      <div className="home-section-nav home-container">
        <span>UNFRAME MAG / ART & CULTURE</span>
        <a href="#archive">
          전체 아카이브 <ArrowUpRight size={14} />
        </a>
      </div>
      <CoverStage stories={covers} />
      <section
        className="home-section home-container"
        aria-labelledby="home-picks"
      >
        <div className="home-section-heading">
          <div>
            <p className="home-kicker">EDITOR’S PICKS</p>
            <h2 id="home-picks">지금 읽고 싶은 이야기</h2>
          </div>
          <a className="home-text-link" href="#archive">
            모든 글 <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="home-editorial-grid">
          <div className="home-picks">
            {picks.map((article) => (
              <Story key={article.editionNo} article={article} />
            ))}
          </div>
          <aside className="home-reading">
            <h3>처음이라면, 이 글부터</h3>
            <p className="home-small">에디터가 제안하는 읽기 순서</p>
            <ol>
              {reading.map((article, index) => (
                <li key={article.editionNo}>
                  <span className="home-reading-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link to={articlePath(article)}>
                    <span className="home-kicker">{article.category}</span>
                    <h4>{article.title}</h4>
                    <span className="home-small">
                      NO.{edition(article)} ·{" "}
                      {estimateReadMinutes(article, { min: 2 })}분
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
      <section
        className="home-letter home-container"
        aria-labelledby="home-letter"
      >
        <div>
          <p className="home-kicker">EDITOR’S LETTER</p>
          <h2 id="home-letter">
            Archive is
            <br />
            not a feed.
          </h2>
        </div>
        <div className="home-letter-copy">
          <p>
            U#은 전시의 결과만이 아니라, 그 과정에 남는 질문과 감각을
            기록합니다.
          </p>
          <p>
            빠르게 소비되지 않는 문장과 이미지를 위해, 우리는 “번호”로 역사를
            쌓습니다.
          </p>
          <p className="home-small">UNFRAME MAG / Editor</p>
          <Link to="/about" className="home-text-link">
            U#에 대하여 <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      {themeStories.length > 0 && (
        <section
          className="home-section home-container"
          aria-labelledby="home-topic"
        >
          <div className="home-section-heading">
            <div>
              <p className="home-kicker">READING NOTES</p>
              <h2 id="home-topic">다른 이야기, 이어지는 시선</h2>
            </div>
          </div>
          <div className="home-topic-grid">
            <div className="home-topic-intro">
              <h3>
                하나의 전시가
                <br />
                남기는 여러 질문.
              </h3>
              <p>
                작품을 바라보는 일에서 창작을 이어가는 마음까지. 서로 다른 글을
                오가며 나만의 연결을 찾아보세요.
              </p>
              <a className="home-text-link" href="#archive">
                다른 주제 찾아보기 <ArrowRight size={16} />
              </a>
            </div>
            <div className="home-topic-stories">
              {themeStories.map((article) => (
                <article key={article.editionNo}>
                  <ArticleMeta article={article} />
                  <h3>
                    <Link to={articlePath(article)}>{article.title}</Link>
                  </h3>
                  <p>{article.excerpt || article.subtitle}</p>
                  <Link to={articlePath(article)} className="home-text-link">
                    이어서 읽기 <ArrowUpRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
      {projects.length > 0 && (
        <section
          className="home-project-strip home-container"
          aria-label="언프레임 프로젝트"
        >
          <Headphones size={20} />
          <div>
            <strong>{projects[0].title}</strong>
            <span>{projects[0].copy}</span>
          </div>
          <a
            href={links[projects[0].key]}
            target="_blank"
            rel="noopener noreferrer"
            className="home-text-link"
          >
            프로젝트 살펴보기 <ArrowUpRight size={16} />
          </a>
        </section>
      )}
      <section
        id="archive"
        className="home-section home-container home-archive"
        aria-labelledby="home-archive-title"
      >
        <aside className="home-archive-aside">
          <p className="home-kicker">ARCHIVE</p>
          <h2 id="home-archive-title">
            Gate to <br />
            Letters
          </h2>
          <div className="home-categories" aria-label="아카이브 카테고리">
            {ARCHIVE_CATEGORIES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={category === item.key}
                onClick={() => setCategory(item.key)}
              >
                <span>{item.key === "All" ? "전체 아카이브" : item.label}</span>
                <span>
                  {item.key === "All"
                    ? articles.length
                    : articles.filter(
                        (article) => article.category === item.key,
                      ).length}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <div className="home-archive-results">
          <label className="home-search">
            <Search size={18} />
            <span className="sr-only">아카이브 검색</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="제목, 주제, 작가로 찾아보기"
            />
          </label>
          <p className="home-small" role="status">
            {filtered.length}개의 이야기
          </p>
          {filtered.length ? (
            <div className="home-archive-grid">
              {filtered.map((article) => (
                <Story key={article.editionNo} article={article} />
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <p>조건에 맞는 이야기가 아직 없어요.</p>
              <button
                type="button"
                onClick={() => {
                  setCategory("All");
                  setSearch("");
                }}
              >
                전체 글 보기
              </button>
            </div>
          )}
        </div>
      </section>
      <section
        className="home-section home-container"
        aria-labelledby="home-boards"
      >
        <div className="home-section-heading">
          <div>
            <p className="home-kicker">READERS & STORIES</p>
            <h2 id="home-boards">함께 만드는 읽기의 기록</h2>
          </div>
          <div className="home-period" role="group" aria-label="집계 기간">
            <button
              type="button"
              aria-pressed={period === "weekly"}
              onClick={() => setPeriod("weekly")}
            >
              주간
            </button>
            <button
              type="button"
              aria-pressed={period === "monthly"}
              onClick={() => setPeriod("monthly")}
            >
              월간
            </button>
          </div>
        </div>
        <div className="home-boards">
          <RankingBoard title="공감한 이야기" rollup={likes} />
          <RankingBoard title="많이 읽은 이야기" rollup={views} />
          <ReaderBoard />
        </div>
      </section>
      {network.newsletterUrl && (
        <section className="home-newsletter">
          <div className="home-container">
            <div>
              <p className="home-kicker">UNFRAME LETTER</p>
              <h2>
                다음 이야기는,
                <br />
                당신의 메일함으로.
              </h2>
              <p>전시 뒤편의 생각, 프로젝트의 과정, 그리고 조용한 뉴스.</p>
            </div>
            <a
              href={network.newsletterUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              뉴스레터 구독하기 <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
      )}
      <section className="home-closing home-container">
        <p>전시를 넘어, 오래 남는 이야기.</p>
        <a href="#archive" className="home-text-link">
          아카이브로 돌아가기 <ArrowUpRight size={16} />
        </a>
        {projects.length > 1 && (
          <div
            className="home-project-links"
            aria-label="더 많은 언프레임 프로젝트"
          >
            {projects.slice(1).map((project) => (
              <a
                key={project.key}
                href={links[project.key]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.title} <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
