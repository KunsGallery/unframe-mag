import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import UserRewardsPanel from "../components/admin/UserRewardsPanel";

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

export default function AdminPage({ user, isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);

  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);

  const [heroEditionNo, setHeroEditionNo] = useState(null);
  const [editorPicks, setEditorPicks] = useState([]); // editionNo[]
  const [saving, setSaving] = useState(false);

  // ✅ 홈 큐레이션 config 불러오기(초기값)
  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      try {
        const ref = doc(db, "config", "home");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          setHeroEditionNo(data.heroEditionNo || null);
          setEditorPicks(Array.isArray(data.editorPicks) ? data.editorPicks : []);
        }
      } catch (e) {
        console.error(e);
        // config 읽기 실패는 치명적이지 않음
      }
    })();
  }, [isAdmin]);

  // ✅ published 글 목록 불러오기
  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "articles"),
          where("status", "==", "published"),
          orderBy("sortIndex", "desc")
        );
        const snap = await getDocs(q);
        setArticles(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
        toast("published 글 목록을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  const togglePick = (editionNo) => {
    setEditorPicks((prev) => {
      const s = new Set(prev);
      if (s.has(editionNo)) s.delete(editionNo);
      else {
        if (s.size >= 6) {
          toast("에디터픽은 최대 6개까지 가능해요.");
          return prev;
        }
        s.add(editionNo);
      }
      return Array.from(s);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "config", "home");
      await setDoc(
        ref,
        {
          heroEditionNo: heroEditionNo || null,
          editorPicks: editorPicks,
          updatedAt: new Date(),
          updatedBy: user?.email || null,
        },
        { merge: true }
      );
      toast("홈 설정 저장 완료!");
    } catch (e) {
      console.error(e);
      toast("저장 실패(권한/규칙 확인)");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-24 text-center font-black italic uppercase tracking-widest text-zinc-400">
        Admin only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-24 text-center font-black italic uppercase tracking-widest text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? "bg-zinc-950 text-white" : "bg-white text-black"} min-h-screen`}>
      <div className="max-w-[1100px] mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              / ADMIN
            </div>
            <h1 className="mt-4 text-4xl font-black italic uppercase tracking-tighter">
              Home Curation
            </h1>
            <p className="mt-3 text-sm opacity-70">
              히어로 1개 + 에디터픽 최대 6개를 지정해요.
            </p>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-4 rounded-2xl bg-[#004aad] text-white font-black text-xs tracking-[0.4em] uppercase italic disabled:opacity-50"
            type="button"
          >
            {saving ? "SAVING…" : "SAVE"}
          </button>
        </div>

        {/* ✅ Rewards Panel (유저 지급/회수/등급) */}
        <UserRewardsPanel
          isAdmin={isAdmin}
          adminEmail={user?.email}
          isDarkMode={isDarkMode}
          onToast={onToast}
        />

        {/* Home Curation */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {/* Hero chooser */}
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Hero (1)
            </div>
            <div className="mt-4 space-y-2">
              {articles.slice(0, 20).map((a) => (
                <label key={a.docId} className="flex items-center gap-3 py-2">
                  <input
                    type="radio"
                    name="hero"
                    checked={heroEditionNo === a.editionNo}
                    onChange={() => setHeroEditionNo(a.editionNo)}
                  />
                  <span className="text-xs font-black opacity-70">
                    #{String(a.editionNo).padStart(3, "0")}
                  </span>
                  <span className="text-sm font-black line-clamp-1">{a.title || "Untitled"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Editor picks */}
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Editor Picks (max 6)
            </div>
            <div className="mt-4 space-y-2">
              {articles.slice(0, 30).map((a) => {
                const checked = editorPicks.includes(a.editionNo);
                return (
                  <label key={a.docId} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePick(a.editionNo)}
                    />
                    <span className="text-xs font-black opacity-70">
                      #{String(a.editionNo).padStart(3, "0")}
                    </span>
                    <span className="text-sm font-black line-clamp-1">{a.title || "Untitled"}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 text-xs opacity-70">
              선택됨: <b>{editorPicks.length}</b>/6
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}