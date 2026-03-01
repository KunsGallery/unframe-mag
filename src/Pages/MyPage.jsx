import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUserProfile } from "../hooks/useUserProfile";
import { useSavedArticles } from "../hooks/useSavedArticles";

const NICK_MIN = 2;
const NICK_MAX = 20;

function validateNickname(name) {
  const v = String(name || "").trim();
  if (v.length < NICK_MIN) return `닉네임은 최소 ${NICK_MIN}자`;
  if (v.length > NICK_MAX) return `닉네임은 최대 ${NICK_MAX}자`;
  if (/\s/.test(v)) return "닉네임에는 공백을 넣을 수 없어요";
  return null;
}

function padEdition(editionNo) {
  if (!editionNo) return "---";
  const s = String(editionNo);
  return s.length >= 3 ? s : s.padStart(3, "0");
}

function coverUrlOfSaved(doc) {
  return doc?.coverMedium || doc?.cover || "";
}

export default function MyPage({ isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { user, profile, loading } = useUserProfile();

  // ✅ Saved Articles
  const {
    user: authUser,
    loading: savingLoading,
    savedDocs,
    unsave,
  } = useSavedArticles();

  // Nickname
  const [nickname, setNickname] = useState("");
  const [savingNick, setSavingNick] = useState(false);
  const [err, setErr] = useState("");
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNickname(profile.nickname || "");
  }, [profile?.nickname]);

  useEffect(() => {
    if (!profile) return;
    if (profile.nicknameChanged === false) {
      const key = `uf_seen_nick_intro_${profile.uid}`;
      const seen = localStorage.getItem(key);
      if (!seen) {
        setShowIntro(true);
        localStorage.setItem(key, "1");
      }
    }
  }, [profile?.uid, profile?.nicknameChanged]);

  const canChange = useMemo(() => {
    return !!user && !!profile && profile.nicknameChanged === false;
  }, [user, profile]);

  const saveNickname = async () => {
    setErr("");
    if (!user || !profile) return;

    if (!canChange) {
      setErr("닉네임은 1회만 변경할 수 있어요.");
      return;
    }

    const next = String(nickname || "").trim();
    const vErr = validateNickname(next);
    if (vErr) {
      setErr(vErr);
      return;
    }

    setSavingNick(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          nickname: next,
          nicknameChanged: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast("닉네임 변경 완료!");
      setShowIntro(false);
    } catch (e) {
      console.error(e);
      setErr("저장 실패(권한/규칙 확인)");
    } finally {
      setSavingNick(false);
    }
  };

  // ✅ savedDocs 정렬(최근 저장 먼저)
  const savedList = useMemo(() => {
    const arr = Array.isArray(savedDocs) ? [...savedDocs] : [];
    arr.sort((a, b) => {
      const at = a?.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bt = b?.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bt - at;
    });
    return arr;
  }, [savedDocs]);

  const removeSaved = async (editionNo) => {
    try {
      await unsave(editionNo);
      toast("저장 해제됨");
    } catch (e) {
      console.error(e);
      toast("저장 해제 실패");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-black italic tracking-widest uppercase text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-3">
        <div className="text-zinc-400 font-black italic tracking-widest uppercase">
          Login Required
        </div>
        <div className="text-sm text-zinc-500">
          My#는 로그인 후 이용할 수 있어요.
        </div>
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
              / MY#
            </div>
            <h1 className="mt-4 text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
              Your Library
            </h1>
            <p className="mt-3 text-sm opacity-70">
              닉네임 / 저장한 글 / 업적(예정)
            </p>
          </div>
        </div>

        {/* Profile card */}
        <div className={`mt-10 rounded-3xl border p-8 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black tracking-widest uppercase opacity-60">
                signed in
              </div>
              <div className="mt-2 text-xl font-black truncate">
                {profile?.nickname || user.displayName || "U# User"}
                {profile?.nicknameChanged ? (
                  <span className="ml-2 text-[11px] font-black px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-300">
                    locked
                  </span>
                ) : (
                  <span className="ml-2 text-[11px] font-black px-2 py-1 rounded-full bg-[#004aad]/15 text-[#004aad]">
                    change 1x
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {user.email}
              </div>
            </div>
          </div>

          {/* Nickname change */}
          <div className="mt-8 grid md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-8">
              <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
                Nickname
              </div>

              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={!canChange || savingNick}
                className={[
                  "mt-3 w-full px-4 py-3 rounded-2xl border bg-transparent text-sm font-black",
                  isDarkMode ? "border-zinc-800" : "border-zinc-200",
                  (!canChange || savingNick) ? "opacity-60" : "",
                ].join(" ")}
                placeholder="닉네임 입력"
              />

              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                닉네임은 <b>1회만 변경</b> 가능해요. (악용 방지)
              </div>

              {err && <div className="mt-2 text-sm font-black text-red-500">{err}</div>}
            </div>

            <div className="md:col-span-4 flex md:justify-end">
              <button
                onClick={saveNickname}
                disabled={!canChange || savingNick}
                className={[
                  "px-6 py-4 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition",
                  (!canChange || savingNick)
                    ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                    : "bg-[#004aad] text-white hover:bg-black",
                ].join(" ")}
              >
                {savingNick ? "SAVING…" : "SAVE"}
              </button>
            </div>
          </div>
        </div>

        {/* Library / Achievements */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {/* ✅ Saved Articles (실제 목록) */}
          <div className={`rounded-3xl border p-8 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
                  Saved Articles
                </div>
                <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  저장한 글은 여기서 모아볼 수 있어요.
                </div>
              </div>

              <div className="text-xs font-black opacity-60">
                {savingLoading ? "…" : `${savedList.length}`}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {!authUser ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  저장 목록은 로그인 후 확인할 수 있어요.
                </div>
              ) : savingLoading ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  불러오는 중…
                </div>
              ) : savedList.length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  아직 저장한 글이 없어요. 글에서 <b>SAVE</b>를 눌러보세요.
                </div>
              ) : (
                savedList.map((s) => {
                  const editionNo = String(s.editionNo || s.id);
                  const img = coverUrlOfSaved(s);
                  return (
                    <div
                      key={editionNo}
                      className={`rounded-2xl border overflow-hidden ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}
                    >
                      <Link to={`/article/${editionNo}`} className="block group">
                        <div className="h-36 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
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

                        <div className="p-5">
                          <div className="flex items-center justify-between text-[10px] font-black italic tracking-[0.4em] uppercase opacity-60">
                            <span>#{padEdition(editionNo)}</span>
                            <span className="text-[#004aad]">{s.category || "—"}</span>
                          </div>
                          <div className="mt-2 text-lg font-black italic tracking-tight line-clamp-2">
                            {s.title || "Untitled"}
                          </div>
                        </div>
                      </Link>

                      <div className={`px-5 pb-5 flex justify-end`}>
                        <button
                          onClick={() => removeSaved(editionNo)}
                          className={`text-[10px] font-black tracking-[0.35em] uppercase italic px-4 py-2 rounded-xl border transition ${
                            isDarkMode
                              ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                              : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                          }`}
                          type="button"
                          title="Remove from saved"
                        >
                          UNSAVE
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Achievements placeholder */}
          <div className={`rounded-3xl border p-8 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Achievements / Stickers
            </div>
            <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              (다음 단계) 업적/스티커가 여기에 보여요.
            </div>
          </div>
        </div>
      </div>

      {/* Intro Modal */}
      {showIntro && canChange && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 p-6">
          <div className={`w-full max-w-lg rounded-3xl p-8 border ${isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Welcome
            </div>
            <div className="mt-3 text-2xl font-black italic tracking-tighter uppercase">
              Set your nickname
            </div>
            <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              닉네임은 <b>1회만 변경</b>할 수 있어요. 댓글/랭킹에 이 이름이 표시됩니다.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowIntro(false)}
                className={`px-4 py-3 rounded-2xl text-xs font-black tracking-[0.3em] uppercase italic border ${
                  isDarkMode ? "border-zinc-800 text-zinc-300" : "border-zinc-200 text-zinc-700"
                }`}
                type="button"
              >
                Later
              </button>
              <button
                onClick={() => setShowIntro(false)}
                className="px-4 py-3 rounded-2xl text-xs font-black tracking-[0.3em] uppercase italic bg-[#004aad] text-white"
                type="button"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}