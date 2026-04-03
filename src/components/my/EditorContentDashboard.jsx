import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";

function padEdition(editionNo) {
  if (!editionNo) return "---";
  const s = String(editionNo);
  return s.length >= 3 ? s : s.padStart(3, "0");
}

function tsToMs(ts) {
  return ts?.toMillis ? ts.toMillis() : 0;
}

function coverOf(item) {
  return item?.coverMedium || item?.cover || "";
}

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  return `${day}일 전`;
}

export default function EditorContentDashboard({ userEmail, isDarkMode }) {
  const [published, setPublished] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setPublished([]);
      setLoadingPublished(false);
      return;
    }

    const qy = query(
      collection(db, "articles"),
      where("status", "==", "published"),
      where("authorEmail", "==", String(userEmail))
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => tsToMs(b.updatedAt) - tsToMs(a.updatedAt));
        setPublished(list.slice(0, 8));
        setLoadingPublished(false);
      },
      (e) => {
        console.error("[EditorContentDashboard] published error:", e);
        setPublished([]);
        setLoadingPublished(false);
      }
    );

    return () => unsub();
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      setDrafts([]);
      setLoadingDrafts(false);
      return;
    }

    const qy = query(
      collection(db, "articles"),
      where("status", "==", "draft"),
      where("authorEmail", "==", String(userEmail))
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => tsToMs(b.updatedAt) - tsToMs(a.updatedAt));
        setDrafts(list.slice(0, 8));
        setLoadingDrafts(false);
      },
      (e) => {
        console.error("[EditorContentDashboard] drafts error:", e);
        setDrafts([]);
        setLoadingDrafts(false);
      }
    );

    return () => unsub();
  }, [userEmail]);

  return (
    <section
      className={`rounded-[30px] border p-5 sm:p-6 lg:p-8 ${
        isDarkMode
          ? "border-zinc-800 bg-zinc-950/80"
          : "border-black/10 bg-white/90"
      } backdrop-blur-xl`}
    >
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-55">
            / Editor Content Dashboard
          </div>
          <div className="mt-2 text-sm leading-6 opacity-70">
            최근 발행글과 드래프트를 한 화면에서 빠르게 정리하는 에디터용
            아카이브입니다.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CountPill
            label="Published"
            value={loadingPublished ? "…" : published.length}
            isDarkMode={isDarkMode}
          />
          <CountPill
            label="Drafts"
            value={loadingDrafts ? "…" : drafts.length}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      <div className="mt-6 grid xl:grid-cols-2 gap-6">
        <ArticleLane
          title="Published"
          subtitle="최근 발행한 글"
          items={published}
          loading={loadingPublished}
          isDarkMode={isDarkMode}
          mode="published"
        />

        <ArticleLane
          title="Draft"
          subtitle="최근 작업 중인 초안"
          items={drafts}
          loading={loadingDrafts}
          isDarkMode={isDarkMode}
          mode="draft"
        />
      </div>
    </section>
  );
}

function CountPill({ label, value, isDarkMode }) {
  return (
    <div
      className={`rounded-full px-4 py-2 text-[10px] font-black tracking-[0.28em] uppercase italic ${
        isDarkMode
          ? "bg-white/[0.05] text-zinc-200 border border-zinc-800"
          : "bg-black/[0.04] text-zinc-700 border border-black/10"
      }`}
    >
      {label} · {value}
    </div>
  );
}

function ArticleLane({ title, subtitle, items, loading, isDarkMode, mode }) {
  return (
    <div
      className={`rounded-[26px] border p-4 sm:p-5 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.42em] uppercase italic font-black opacity-55">
            {title}
          </div>
          <div className="mt-2 text-sm opacity-65">{subtitle}</div>
        </div>

        <div className="text-xs font-black opacity-55">
          {loading ? "…" : items.length}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="text-sm opacity-70">불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="text-sm opacity-70">
            {mode === "draft"
              ? "아직 draft가 없어요."
              : "아직 발행한 글이 없어요."}
          </div>
        ) : (
          items.map((item, idx) => (
            <ArticleRowCard
              key={item.id}
              item={item}
              index={idx}
              isDarkMode={isDarkMode}
              mode={mode}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ArticleRowCard({ item, index, isDarkMode, mode }) {
  const img = coverOf(item);

  return (
    <Link
      to={
        mode === "draft"
          ? "/write"
          : `/article/${String(item.editionNo || item.id)}`
      }
      state={mode === "draft" ? { draftId: item.id } : undefined}
      className={`group block rounded-[22px] border overflow-hidden transition ${
        isDarkMode
          ? "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/70"
          : "border-black/10 bg-white hover:bg-[#faf8f2]"
      }`}
    >
      <div className="grid grid-cols-[92px_1fr] sm:grid-cols-[108px_1fr] min-w-0">
        <div className="h-full min-h-[108px] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          {img ? (
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[11px] opacity-50">
              No Cover
            </div>
          )}
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 text-[10px] font-black italic tracking-[0.35em] uppercase opacity-55">
            <span className="truncate">
              {mode === "published"
                ? `#${padEdition(item.editionNo)}`
                : `Draft ${String(index + 1).padStart(2, "0")}`}
            </span>
            <span className="text-[#004aad] truncate">
              {item.category || "—"}
            </span>
          </div>

          <div className="mt-2 text-[18px] sm:text-[19px] leading-[1.02] font-black italic tracking-[-0.04em] line-clamp-2">
            {item.title || "Untitled"}
          </div>

          {item.subtitle ? (
            <div className="mt-2 text-[12px] sm:text-[13px] leading-5 opacity-65 line-clamp-2">
              {item.subtitle}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] opacity-55">
            <span>{timeAgo(item.updatedAt || item.createdAt)}</span>
            <span className="font-black tracking-[0.22em] uppercase italic text-[#004aad]">
              {mode === "draft" ? "Edit →" : "Open →"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}