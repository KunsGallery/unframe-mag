import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useHomeConfig } from "../hooks/useHomeConfig";

const PRIMARY_BLUE = "#004aad";

// ✅ 에디터 category 값과 맞춤
const CATEGORIES = [
  { key: "All", label: "View All Archive", sub: "ALL ITEMS" },
  { key: "EXHIBITION", label: "Exhibition", sub: "CATEGORY 01" },
  { key: "PROJECT", label: "Project", sub: "CATEGORY 02" },
  { key: "INTERVIEW", label: "Interview", sub: "CATEGORY 03" },
  { key: "EDITORIAL", label: "Editorial", sub: "CATEGORY 04" },
];

function padEdition(editionNo) {
  if (!editionNo) return "---";
  const s = String(editionNo);
  return s.length >= 3 ? s : s.padStart(3, "0");
}

function coverUrlOf(article) {
  return article?.coverMedium || article?.coverThumb || article?.cover || "";
}

function stripHTML(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function readMinutesFromHTML(html) {
  const text = stripHTML(html);
  const words = text ? text.split(" ").length : 0;
  return Math.max(2, Math.round(words / 200)); // 200 wpm
}

function timeEmoji(min) {
  if (min <= 2) return "🚀";
  if (min <= 5) return "☕️";
  if (min <= 9) return "📖";
  if (min <= 15) return "🛋️";
  return "🧠";
}

export default function HomePage({ isDarkMode }) {
  // archive 전환
  const [activeCat, setActiveCat] = useState("All");
  const [displayCat, setDisplayCat] = useState("All");
  const [fade, setFade] = useState("in");

  // firestore
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // ✅ home config (hero/editorPicks)
  const { config } = useHomeConfig();
  const heroEditionNo = config?.heroEditionNo ? String(config.heroEditionNo) : null;
  const editorPicks = Array.isArray(config?.editorPicks) ? config.editorPicks.map(String) : [];

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setLoadErr("");

      try {
        const q = query(
          collection(db, "articles"),
          where("status", "==", "published"),
          orderBy("sortIndex", "desc"),
          limit(60)
        );

        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));

        if (!alive) return;
        setArticles(list);
      } catch (e) {
        console.error("[HomePage] load articles error:", e);
        if (!alive) return;
        setLoadErr("아카이브를 불러오지 못했어요.");
        setArticles([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (activeCat === displayCat) return;
    setFade("out");
    const t = setTimeout(() => {
      setDisplayCat(activeCat);
      setFade("in");
    }, 180);
    return () => clearTimeout(t);
  }, [activeCat, displayCat]);

  // ✅ hero 선택
  const cover = useMemo(() => {
    if (heroEditionNo) {
      const found = articles.find((a) => String(a.editionNo) === heroEditionNo);
      if (found) return found;
    }
    return articles[0] || null;
  }, [articles, heroEditionNo]);

  // ✅ featured(editor picks 우선 + 부족하면 채움)
  const featured = useMemo(() => {
    if (editorPicks.length > 0) {
      const map = new Map(articles.map((a) => [String(a.editionNo), a]));
      const picked = editorPicks.map((id) => map.get(id)).filter(Boolean);
      const used = new Set(picked.map((a) => String(a.editionNo)));
      const fill = articles.filter((a) => !used.has(String(a.editionNo)));
      return [...picked, ...fill].slice(0, 6);
    }
    return articles.slice(0, 6);
  }, [articles, editorPicks]);

  // ✅ archive displayItems(카테고리 필터)
  const displayItems = useMemo(() => {
    return displayCat === "All"
      ? articles
      : articles.filter((x) => x.category === displayCat);
  }, [articles, displayCat]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-zinc-400 font-black italic tracking-widest uppercase">
        Loading Archive...
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-3">
        <div className="text-zinc-400 font-black italic tracking-widest uppercase">
          {loadErr}
        </div>
        <div className="text-xs text-zinc-500">
          Firestore 연결/규칙(status=published read)을 확인해줘.
        </div>
      </div>
    );
  }

  if (!cover) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-3">
        <div className="text-zinc-400 font-black italic tracking-widest uppercase">
          No Published Articles
        </div>
        <div className="text-xs text-zinc-500">
          에디터에서 글을 발행(status=published)하면 홈에 나타나요.
        </div>
      </div>
    );
  }

  const coverEdition = padEdition(cover.editionNo);
  const coverImg = coverUrlOf(cover);
  const coverMin = readMinutesFromHTML(cover.contentHTML);
  const coverEmoji = timeEmoji(coverMin);

  return (
    <div className="animate-in fade-in duration-700">
      {/* Hero */}
      <section className="relative h-[92vh] overflow-hidden bg-black text-white">
        {coverImg ? (
          <img
            src={coverImg}
            className="absolute inset-0 h-full w-full object-cover opacity-65 scale-105"
            alt="Cover"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black via-black/25 to-black/10" />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "6px 6px",
          }}
        />

        <div className="absolute -right-10 -bottom-28 pointer-events-none select-none">
          <div className="text-[220px] md:text-[360px] font-black italic tracking-tighter text-white/10 leading-none">
            #{coverEdition}
          </div>
        </div>

        <div className="relative z-10 h-full mag-grid pt-28 pb-16 flex items-end">
          <div className="max-w-6xl w-full">
            <div className="flex flex-wrap items-center gap-4 mag-meta">
              <span className="px-4 py-2 bg-white/10 rounded-full border border-white/10">
                Issue #{coverEdition}
              </span>
              <span className="px-4 py-2 bg-white/10 rounded-full border border-white/10">
                {cover.category || "—"}
              </span>
              <span className="px-4 py-2 bg-white/10 rounded-full border border-white/10">
                {coverEmoji} {coverMin} min read
              </span>
            </div>

            <h1 className="mt-8 mag-h1">{cover.title || "Untitled"}</h1>

            <p className="mt-8 max-w-2xl mag-deck text-white">
              {cover.excerpt || cover.subtitle || "—"}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to={`/article/${cover.editionNo}`}
                className="px-8 py-5 rounded-2xl bg-white text-black font-black text-xs tracking-[0.4em] uppercase italic inline-flex items-center justify-center gap-2 hover:opacity-90 transition"
              >
                Read Cover <ArrowUpRight size={16} />
              </Link>
              <a
                href="#archive"
                className="px-8 py-5 rounded-2xl bg-transparent border border-white/20 text-white font-black text-xs tracking-[0.4em] uppercase italic inline-flex items-center justify-center gap-2 hover:bg-white/10 transition"
              >
                Browse Archive <ArrowDown size={16} />
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-2 text-[10px] tracking-[0.5em] uppercase italic opacity-70">
              <span>Caption: {cover.title || "—"}</span>
              <span>Category: {cover.category || "—"}</span>
              <span>Author: {cover.author || "—"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className={`${isDarkMode ? "bg-black text-white" : "bg-white text-black"} mag-section mag-grid`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="mag-kicker">/ EDITOR'S PICKS</p>
              <h2 className="mt-4 mag-h2">Featured</h2>
            </div>
            <a href="#archive" className="text-[10px] font-black tracking-[0.5em] uppercase italic opacity-60 hover:opacity-100 transition">
              View all →
            </a>
          </div>

          {featured.length < 3 ? (
            <div className="mt-12 text-sm text-zinc-500">
              발행된 글이 더 쌓이면 Featured가 채워져요.
            </div>
          ) : (
            <div className="mt-14 grid lg:grid-cols-12 gap-6">
              <FeatureCard item={featured[0]} className="lg:col-span-7 h-[420px]" isDarkMode={isDarkMode} />
              <div className="lg:col-span-5 grid gap-6">
                <FeatureCard item={featured[1]} className="h-[200px]" isDarkMode={isDarkMode} compact />
                <FeatureCard item={featured[2]} className="h-[200px]" isDarkMode={isDarkMode} compact />
              </div>
              <div className="lg:col-span-12 grid md:grid-cols-3 gap-6">
                {featured.slice(3, 6).map((it) => (
                  <FeatureCard key={it.docId || it.editionNo} item={it} className="h-[220px]" isDarkMode={isDarkMode} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <SubscribeBand variant="bold" />

      {/* Editor's Letter */}
      <section className={`${isDarkMode ? "bg-black text-white" : "bg-white text-black"} mag-section mag-grid`}>
        <div className="max-w-5xl mx-auto">
          <p className="mag-kicker">/ EDITOR'S LETTER</p>
          <h3 className="mt-6 mag-h3">Archive is not a feed.</h3>
          <div className="mt-10 space-y-8 mag-body">
            <p>U#은 전시의 결과만이 아니라, 그 과정에 남는 질문과 감각을 기록합니다.</p>
            <p>빠르게 소비되지 않는 문장과 이미지를 위해, 우리는 “번호”로 역사를 쌓습니다.</p>
            <p className={`${isDarkMode ? "text-white/80" : "text-black/70"} font-black`}>
              — UNFRAME MAG / Editor
            </p>
          </div>
        </div>
      </section>

      {/* Archive */}
      <section id="archive" className={`${isDarkMode ? "bg-black text-white" : "bg-white text-black"} py-28 mag-grid`}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-14">
          <aside className="lg:col-span-4">
            <div className="sticky top-28">
              <p className="mag-kicker">/ ARCHIVE</p>
              <h3 className="mt-6 text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.9]">
                Gate<br />to Letters
              </h3>

              <ul className={`mt-10 space-y-4 border-t pt-8 ${isDarkMode ? "border-zinc-800" : "border-zinc-100"}`}>
                {CATEGORIES.map((c) => (
                  <li key={c.key}>
                    <button
                      onClick={() => setActiveCat(c.key)}
                      className={[
                        "w-full text-left py-3 transition",
                        "font-black italic uppercase tracking-tight",
                        activeCat === c.key ? "text-[#004aad]" : "opacity-30 hover:opacity-100 hover:text-[#004aad]"
                      ].join(" ")}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl md:text-3xl">{c.label}</span>
                        <span className="text-[10px] tracking-[0.5em] opacity-60">{c.sub}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="lg:col-span-8">
            <div className={`transition-all duration-300 ${fade === "out" ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
              {displayItems.length === 0 ? (
                <div className="p-8 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 text-sm text-zinc-500">
                  이 카테고리에 발행된 글이 아직 없어요.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {displayItems.map((it) => (
                    <ArchiveCard key={it.docId || it.editionNo} item={it} isDarkMode={isDarkMode} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative h-[70vh] overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/45 to-transparent" />
        <div className="relative z-10 h-full mag-grid flex items-center">
          <div className="max-w-4xl">
            <p className="mag-kicker opacity-70">/ ONE LAST THING</p>
            <h3 className="mt-6 text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9]">
              Break frames,<br />build resonance.
            </h3>
            <a
              href="#archive"
              className="mt-10 inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white text-black font-black text-xs tracking-[0.4em] uppercase italic hover:opacity-90 transition"
            >
              Back to Archive <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <SubscribeBand variant="minimal" />
    </div>
  );
}

function FeatureCard({ item, className = "", compact = false, isDarkMode }) {
  const edition = padEdition(item?.editionNo);
  const img = coverUrlOf(item);

  const min = readMinutesFromHTML(item?.contentHTML);
  const emoji = timeEmoji(min);

  return (
    <Link
      to={`/article/${item.editionNo}`}
      className={[
        "group relative rounded-[2.5rem] overflow-hidden border shadow-xl transition hover:translate-y-[-6px]",
        isDarkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-100 bg-white",
        className
      ].join(" ")}
    >
      {img ? (
        <img src={img} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-85 transition" />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}

      <div className="absolute inset-0 bg-linear-to-t from-black via-black/35 to-transparent" />
      <div className="relative z-10 p-10 h-full flex flex-col justify-end">
        {/* ✅ 카테고리 우측에 1줄 배치 */}
        <div className="flex items-center gap-3 text-[10px] tracking-[0.5em] uppercase font-black italic text-white/80">
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">#{edition}</span>
          <span className="opacity-80 inline-flex items-center gap-2">
            <span>{item.category || "—"}</span>
            <span className="tracking-normal opacity-90">
              {emoji} {min}m
            </span>
          </span>
        </div>

        <h3 className={`mt-4 font-black italic tracking-tighter uppercase ${compact ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl"} leading-none text-white`}>
          {item.title || "Untitled"}
        </h3>
        <p className="mt-4 text-white/75 italic line-clamp-2">{item.excerpt || item.subtitle || "—"}</p>
      </div>
    </Link>
  );
}

function ArchiveCard({ item, isDarkMode }) {
  const edition = padEdition(item?.editionNo);
  const img = coverUrlOf(item);

  const min = readMinutesFromHTML(item?.contentHTML);
  const emoji = timeEmoji(min);

  return (
    <Link
      to={`/article/${item.editionNo}`}
      className={[
        "group rounded-[2rem] overflow-hidden border transition hover:translate-y-[-4px] shadow-lg",
        isDarkMode ? "border-zinc-800 bg-zinc-950" : "border-zinc-100 bg-white",
      ].join(" ")}
    >
      <div className="h-44 overflow-hidden">
        {img ? (
          <img src={img} alt={item.title} className="h-full w-full object-cover group-hover:scale-[1.02] transition" />
        ) : (
          <div className="h-full w-full bg-zinc-900" />
        )}
      </div>

      <div className="p-7">
        {/* ✅ 카테고리 위에 2줄 배치(카테고리/시간) */}
        <div className="flex items-center justify-between text-[10px] font-black italic tracking-[0.4em] uppercase opacity-60">
          <span>#{edition}</span>

          <span className="text-right">
            <div className="text-[#004aad]">{item.category || "—"}</div>
            <div className="tracking-normal opacity-80">
              {emoji} {min}m
            </div>
          </span>
        </div>

        <h4 className="mt-3 text-2xl font-black italic tracking-tighter uppercase leading-[1.1]">
          {item.title || "Untitled"}
        </h4>
        <p className="mt-3 text-zinc-500 italic line-clamp-2">{item.excerpt || item.subtitle || "—"}</p>
      </div>
    </Link>
  );
}

function SubscribeBand({ variant = "bold" }) {
  const isBold = variant === "bold";
  return (
    <section className={isBold ? "bg-[#fdfd75] text-black" : "bg-black text-white"}>
      <div className="mag-grid py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div>
              <p className={`mag-kicker ${isBold ? "opacity-70" : "opacity-60"}`}>/ WEDNESDAY LETTER</p>
              <h3 className={`mt-4 ${isBold ? "mag-h2" : "mag-h3"} leading-[0.95]`}>
                Get a letter<br />every Wednesday.
              </h3>
              <p className={`mt-6 italic ${isBold ? "text-lg opacity-80" : "opacity-70"}`}>
                전시 뒤편의 생각, 프로젝트의 과정, 그리고 조용한 뉴스.
              </p>
            </div>

            <div className={`w-full lg:max-w-xl ${isBold ? "border-b-4 border-black" : "border-b border-white/30"} pb-5 flex flex-col sm:flex-row gap-4`}>
              <input
                type="email"
                placeholder="Your favorite email address"
                className={`flex-1 bg-transparent py-4 px-2 focus:outline-none placeholder:opacity-60 ${isBold ? "text-black placeholder:text-zinc-700" : "text-white placeholder:text-white/60"} text-xl font-bold italic`}
              />
              <button className={`${isBold ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:opacity-90"} px-10 py-5 font-black text-xs tracking-[0.4em] uppercase italic transition`}>
                Join
              </button>
            </div>
          </div>

          <div className={`mt-8 text-[10px] tracking-[0.5em] uppercase italic ${isBold ? "opacity-60" : "opacity-50"}`}>
            No spam. Only letters. Unsubscribe anytime.
          </div>
        </div>
      </div>
    </section>
  );
}