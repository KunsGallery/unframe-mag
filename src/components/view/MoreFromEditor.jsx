import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";

function padEdition(editionNo) {
  if (!editionNo) return "---";
  const s = String(editionNo);
  return s.length >= 3 ? s : s.padStart(3, "0");
}

function tsToMs(ts) {
  return ts?.toMillis ? ts.toMillis() : 0;
}

export default function MoreFromEditor({ article, isDarkMode }) {
  const authorEmail = String(article?.authorEmail || "").trim();
  const currentEditionNo = String(article?.editionNo || "");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorEmail) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const qy = query(
      collection(db, "articles"),
      where("status", "==", "published"),
      where("authorEmail", "==", authorEmail),
      limit(12)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => String(item.editionNo || "") !== currentEditionNo)
          .sort((a, b) => {
            const bySort = Number(b.sortIndex || 0) - Number(a.sortIndex || 0);
            if (bySort !== 0) return bySort;
            return tsToMs(b.updatedAt) - tsToMs(a.updatedAt);
          })
          .slice(0, 4);

        setItems(list);
        setLoading(false);
      },
      (e) => {
        console.error("[MoreFromEditor] snapshot error:", e);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authorEmail, currentEditionNo]);

  if (!authorEmail) return null;
  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="text-[10px] tracking-[0.4em] uppercase font-black italic opacity-55">
        More from this editor
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="text-sm opacity-70">불러오는 중…</div>
        ) : (
          <div
            className={`rounded-2xl border ${
              isDarkMode ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
            {items.map((item, idx) => (
              <Link
                key={item.id}
                to={`/article/${String(item.editionNo)}`}
                className={[
                  "flex items-center justify-between gap-4 px-4 py-3 transition group",
                  isDarkMode ? "hover:bg-zinc-900/70" : "hover:bg-zinc-50",
                  idx !== items.length - 1
                    ? isDarkMode
                      ? "border-b border-zinc-800"
                      : "border-b border-zinc-200"
                    : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="text-sm font-black italic tracking-tight line-clamp-1">
                    {item.title || "Untitled"}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] opacity-55">
                    #{padEdition(item.editionNo)} · {item.category || "—"}
                  </div>
                </div>

                <div className="shrink-0 text-[11px] font-black italic text-[#004aad] opacity-80 group-hover:opacity-100">
                  READ →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}