import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUserProfile } from "../hooks/useUserProfile";
import { useSavedArticles } from "../hooks/useSavedArticles";
import { useMyAchievements } from "../hooks/useMyAchievements";
import { useMyStickers } from "../hooks/useMyStickers";

import TierBadge from "../components/my/TierBadge";
import StickerGrid from "../components/my/StickerGrid";
import AchievementGrid from "../components/my/AchievementGrid";
import "../styles/achievements.css";

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

// 로컬 기준 yyyymmdd
function yyyymmddLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export default function MyPage({ isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { user, profile, loading } = useUserProfile();

  // Achievements
  const { items: achItems = [], ids: achIds = [], loading: achLoading } = useMyAchievements(user?.uid);

  // Saved Articles
  const {
    user: authUser,
    loading: savingLoading,
    savedDocs,
    unsave,
  } = useSavedArticles();

  // Stickers
  const { ids: myStickerIds = [], loading: stickersLoading } = useMyStickers(user?.uid);
  const hasFirstSave = useMemo(
    () => new Set(myStickerIds).has("first_save"),
    [myStickerIds]
  );

  // Daily stats
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setDaily(null);
      setDailyLoading(false);
      return;
    }

    const dayId = yyyymmddLocal(new Date());
    setDailyLoading(true);

    const ref = doc(db, "users", user.uid, "daily", dayId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setDaily(snap.exists() ? snap.data() : null);
        setDailyLoading(false);
      },
      (e) => {
        console.error("[MyPage] daily snapshot error:", e);
        setDaily(null);
        setDailyLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Nickname
  const [nickname, setNickname] = useState("");
  const [savingNick, setSavingNick] = useState(false);
  const [err, setErr] = useState("");
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNickname(profile.nickname || "");
  }, [profile?.nickname, profile]);

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
  }, [profile?.uid, profile?.nicknameChanged, profile]);

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

  // savedDocs 정렬(최근 저장 먼저)
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

  // 숫자 안전 처리
  const xp = Number(profile?.xp || 0);
  const level = Number(profile?.level || 1);
  const streak = Number(profile?.streakCount || 0);

  const dailyCounts = {
    views: Number(daily?.views || 0),
    likes: Number(daily?.likes || 0),
    comments: Number(daily?.comments || 0),
    votes: Number(daily?.votes || 0),
    saves: Number(daily?.saves || 0),
    shares: Number(daily?.shares || 0),
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
    <div
      className={`${
        isDarkMode ? "bg-zinc-950 text-white" : "bg-white text-black"
      } min-h-screen`}
    >
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
            <p className="mt-3 text-sm opacity-70">닉네임 / 저장 / 스티커 / 활동 / 업적</p>
          </div>
        </div>

        {/* Profile card */}
        <div
          className={`mt-10 rounded-3xl border p-8 ${
            isDarkMode ? "border-zinc-800" : "border-zinc-200"
          }`}
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-black tracking-widest uppercase opacity-60">
                signed in
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="text-xl font-black truncate">
                  {profile?.nickname || user.displayName || "U# User"}
                </div>

                <TierBadge
                  tierLabel={profile?.tierLabel || profile?.tier}
                  tierColor={profile?.tierColor}
                  level={level}
                />

                {profile?.nicknameChanged ? (
                  <span className="text-[11px] font-black px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-300">
                    locked
                  </span>
                ) : (
                  <span className="text-[11px] font-black px-2 py-1 rounded-full bg-[#004aad]/15 text-[#004aad]">
                    change 1x
                  </span>
                )}

                {hasFirstSave && (
                  <span className="text-[11px] font-black px-2 py-1 rounded-full bg-[#004aad] text-white">
                    🏷️ first_save
                  </span>
                )}
              </div>

              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {user.email}
              </div>

              {/* XP / LV / STREAK */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatPill label="XP" value={`${xp}`} isDarkMode={isDarkMode} />
                <StatPill
                  label="LEVEL"
                  value={`Lv ${level}`}
                  isDarkMode={isDarkMode}
                />
                <StatPill
                  label="STREAK"
                  value={`${streak} day`}
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* TODAY DAILY */}
              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  isDarkMode ? "border-zinc-800" : "border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
                    TODAY
                  </div>
                  <div className="text-xs opacity-60">
                    {dailyLoading ? "loading…" : yyyymmddLocal(new Date())}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                  <MiniStat k="👁" v={dailyCounts.views} />
                  <MiniStat k="❤️" v={dailyCounts.likes} />
                  <MiniStat k="💬" v={dailyCounts.comments} />
                  <MiniStat k="🗳️" v={dailyCounts.votes} />
                  <MiniStat k="🔖" v={dailyCounts.saves} />
                  <MiniStat k="🔗" v={dailyCounts.shares} />
                </div>

                <div className="mt-2 text-[11px] opacity-60">
                  * 오늘 활동은 trackEvent로 자동 집계돼요.
                </div>
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
                  !canChange || savingNick ? "opacity-60" : "",
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
                  !canChange || savingNick
                    ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                    : "bg-[#004aad] text-white hover:bg-black",
                ].join(" ")}
                type="button"
              >
                {savingNick ? "SAVING…" : "SAVE"}
              </button>
            </div>
          </div>
        </div>

        {/* Saved / Stickers */}
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {/* Saved Articles */}
          <div
            className={`rounded-3xl border p-8 ${
              isDarkMode ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
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
                      className={`rounded-2xl border overflow-hidden ${
                        isDarkMode ? "border-zinc-800" : "border-zinc-200"
                      }`}
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
                            <span className="text-[#004aad]">
                              {s.category || "—"}
                            </span>
                          </div>
                          <div className="mt-2 text-lg font-black italic tracking-tight line-clamp-2">
                            {s.title || "Untitled"}
                          </div>
                        </div>
                      </Link>

                      <div className="px-5 pb-5 flex justify-end">
                        <button
                          onClick={() => removeSaved(editionNo)}
                          className={`text-[10px] font-black tracking-[0.35em] uppercase italic px-4 py-2 rounded-xl border transition ${
                            isDarkMode
                              ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                              : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                          }`}
                          type="button"
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

          {/* Stickers */}
          <div
            className={`rounded-3xl border p-8 ${
              isDarkMode ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Stickers
            </div>
            <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {stickersLoading ? "불러오는 중…" : `보유 스티커 ${myStickerIds.length}개`}
            </div>
            <div className="mt-6">
              <StickerGrid ownedIds={myStickerIds} isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div
          className={`mt-10 rounded-3xl border p-8 ${
            isDarkMode ? "border-zinc-800" : "border-zinc-200"
          }`}
        >
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
                Achievements
              </div>
              <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                획득한 업적과 잠겨 있는 업적을 확인할 수 있어요.
              </div>
            </div>

            <div className="text-xs font-black opacity-60">
              {achLoading ? "…" : `보유 업적 ${achIds.length}개`}
            </div>
          </div>

          <div className="mt-6">
            {achLoading ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                업적을 불러오는 중…
              </div>
            ) : (
              <AchievementGrid
                ownedAchievements={achItems}
                title="My Achievements"
              />
            )}
          </div>
        </div>
      </div>

      {/* Intro Modal */}
      {showIntro && canChange && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-6">
          <div
            className={`w-full max-w-lg rounded-3xl p-8 border ${
              isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
            }`}
          >
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
                  isDarkMode
                    ? "border-zinc-800 text-zinc-300"
                    : "border-zinc-200 text-zinc-700"
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

/* ---------- UI helpers ---------- */

function StatPill({ label, value, isDarkMode }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        isDarkMode ? "border-zinc-800" : "border-zinc-200"
      }`}
    >
      <div className="text-[10px] tracking-[0.4em] uppercase italic font-black opacity-60">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

function MiniStat({ k, v }) {
  return (
    <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800 px-3 py-2">
      <div className="text-[11px] font-black opacity-70">{k}</div>
      <div className="text-sm font-black">{v}</div>
    </div>
  );
}