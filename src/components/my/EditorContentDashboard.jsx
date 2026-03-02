import React, { useEffect, useMemo, useState } from "react";
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
    <div className="mt-10 grid md:grid-cols-2 gap-6">
      <ArticleListCard
        title="Published Articles"
        subtitle="최근 발행한 글"
        items={published}
        loading={loadingPublished}
        isDarkMode={isDarkMode}
        mode="published"
      />

      <ArticleListCard
        title="Drafts"
        subtitle="최근 작업 중인 초안"
        items={drafts}
        loading={loadingDrafts}
        isDarkMode={isDarkMode}
        mode="draft"
      />
    </div>
  );
}

function ArticleListCard({ title, subtitle, items, loading, isDarkMode, mode }) {
  return (
    <div
      className={`rounded-3xl border p-8 ${
        isDarkMode ? "border-zinc-800" : "border-zinc-200"
      }`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
            {title}
          </div>
          <div className="mt-2 text-sm opacity-70">{subtitle}</div>
        </div>

        <div className="text-xs font-black opacity-60">
          {loading ? "…" : `${items.length}`}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="text-sm opacity-70">불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="text-sm opacity-70">
            {mode === "draft" ? "아직 draft가 없어요." : "아직 발행한 글이 없어요."}
          </div>
        ) : (
          items.map((item) => {
            const img = coverOf(item);
            return (
              <div
                key={item.id}
                className={`rounded-2xl border overflow-hidden ${
                  isDarkMode ? "border-zinc-800" : "border-zinc-200"
                }`}
              >
                <Link
                  to={
                    mode === "draft"
                      ? "/write"
                      : `/article/${String(item.editionNo || item.id)}`
                  }
                  state={mode === "draft" ? { draftId: item.id } : undefined}
                  className="block group"
                >
                  <div className="h-28 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
                        No Cover
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between text-[10px] font-black italic tracking-[0.35em] uppercase opacity-60">
                      <span>
                        {mode === "published"
                          ? `#${padEdition(item.editionNo)}`
                          : "DRAFT"}
                      </span>
                      <span className="text-[#004aad]">
                        {item.category || "—"}
                      </span>
                    </div>

                    <div className="mt-2 text-base font-black italic tracking-tight line-clamp-2">
                      {item.title || "Untitled"}
                    </div>

                    <div className="mt-2 text-[11px] opacity-60">
                      {mode === "draft" ? "편집하러 가기 →" : "아티클 열기 →"}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}