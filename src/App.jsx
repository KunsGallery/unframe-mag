import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

function useQuery() {
  const [qs, setQs] = useState(() => new URLSearchParams(window.location.search));
  useEffect(() => {
    const onPop = () => setQs(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return qs;
}

function go(url) {
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const qs = useQuery();
  const mode = qs.get("mode") || "list";
  const idParam = qs.get("id") || "";

  const [list, setList] = useState([]);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // list 로드: published만
  const fetchList = async () => {
    setLoading(true);
    setErr("");
    try {
      const q = query(
        collection(db, "articles"),
        where("status", "==", "published"),
        orderBy("id", "desc")
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
      setList(rows);
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // view 로드: id == Number(idParam)
  const fetchOne = async (id) => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const q = query(
        collection(db, "articles"),
        where("status", "==", "published"),
        where("id", "==", Number(id)),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setArticle(null);
      } else {
        setArticle({ firebaseId: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "list") {
      fetchList();
    } else if (mode === "view") {
      fetchOne(idParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, idParam]);

  const header = useMemo(() => {
    return (
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.35em] uppercase opacity-70">UNFRAME</div>
        <div className="flex gap-2">
          <button onClick={() => go("/?mode=list")} className="px-4 py-2 rounded-full border border-white/20 hover:border-white/50">
            LIST
          </button>
          <button onClick={() => go("/?mode=editor")} className="px-4 py-2 rounded-full border border-white/20 hover:border-white/50">
            EDITOR
          </button>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {header}

        <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-8">
          {loading && <div className="text-white/70">Loading…</div>}
          {err && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {err}
            </div>
          )}

          {mode === "list" && (
            <>
              <h1 className="text-4xl font-bold">List</h1>
              <p className="mt-3 text-white/70">Firestore에서 published 글만 불러옵니다.</p>

              <div className="mt-8 space-y-4">
                {list.length === 0 && !loading ? (
                  <div className="text-white/60">발행된 글이 아직 없어요.</div>
                ) : (
                  list.map((a) => (
                    <div key={a.firebaseId} className="rounded-2xl border border-white/15 p-6 bg-white/5">
                      <div className="text-xs uppercase tracking-[0.25em] text-white/60">
                        No. {a.id} • {a.category}
                      </div>
                      <div className="mt-2 text-2xl font-bold">{a.title || "(No Title)"}</div>
                      <div className="mt-2 text-white/70 line-clamp-2">{a.excerpt || ""}</div>
                      <button
                        className="mt-4 inline-flex items-center gap-2 text-sm border-b border-white/40 hover:border-white"
                        onClick={() => go(`/?mode=view&id=${a.id}`)}
                      >
                        Read the story →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {mode === "view" && (
            <>
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-4xl font-bold">View</h1>
                <button
                  className="px-5 py-2 rounded-full bg-white text-black font-bold hover:opacity-90"
                  onClick={() => go("/?mode=list")}
                >
                  Back
                </button>
              </div>

              <p className="mt-3 text-white/70">
                현재 id: <span className="font-mono text-white/90">{idParam}</span>
              </p>

              {!loading && !article && (
                <div className="mt-8 text-white/60">
                  해당 id의 글을 찾지 못했어요. (Firestore에 id가 숫자로 저장되어 있는지 확인!)
                </div>
              )}

              {article && (
                <div className="mt-8">
                  <div className="text-xs uppercase tracking-[0.25em] text-white/60">
                    No. {article.id} • {article.category}
                  </div>
                  <div className="mt-3 text-4xl font-bold">{article.title}</div>
                  <div className="mt-4 text-white/70 italic">{article.excerpt}</div>

                  <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-6">
                    <div className="text-white/60 text-sm mb-3">contentHTML 미리보기</div>
                    <div
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {mode === "editor" && (
            <>
              <h1 className="text-4xl font-bold">Editor (다음 단계)</h1>
              <p className="mt-3 text-white/70">
                다음 단계에서 Google 로그인 + TipTap + 저장/발행을 붙일 거야.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
