import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useUserProfile } from "../hooks/useUserProfile";
import { useSavedArticles } from "../hooks/useSavedArticles";
import { useMyAchievements } from "../hooks/useMyAchievements";
import { useMyStickers } from "../hooks/useMyStickers";

import TierBadge from "../components/my/TierBadge";
import StickerGrid from "../components/my/StickerGrid";
import AchievementGrid from "../components/my/AchievementGrid";
import EditorContentDashboard from "../components/my/EditorContentDashboard";

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

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  return `${day}일 전`;
}

export default function MyPage({ isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { user, profile, loading } = useUserProfile();

  // Achievements
  const { items: achItems = [], ids: achIds = [], loading: achLoading } =
    useMyAchievements(user?.uid);

  // Saved Articles
  const { user: authUser, loading: savingLoading, savedDocs, unsave } =
    useSavedArticles();

  // Stickers
  const { ids: myStickerIds = [], loading: stickersLoading } = useMyStickers(
    user?.uid
  );
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

  // -----------------------------
  // NEW: Following Editors (유저 공통)
  // -----------------------------
  const [followingEditors, setFollowingEditors] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setFollowingEditors([]);
      setFollowingLoading(false);
      return;
    }

    setFollowingLoading(true);
    const ref = collection(db, "users", user.uid, "followingEditors");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 최근 팔로우 순
        list.sort((a, b) => {
          const at = a?.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bt = b?.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bt - at;
        });
        setFollowingEditors(list);
        setFollowingLoading(false);
      },
      (e) => {
        console.error("[MyPage] followingEditors error:", e);
        setFollowingEditors([]);
        setFollowingLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const unfollow = async (editorUid) => {
    if (!user?.uid || !editorUid) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "users", user.uid, "followingEditors", editorUid));
      batch.delete(doc(db, "users", editorUid, "followers", user.uid));
      await batch.commit();
      toast("언팔로우 완료");
    } catch (e) {
      console.error(e);
      toast("언팔로우 실패");
    }
  };

  // -----------------------------
  // NEW: Editor Dashboard (editor/admin만)
  // -----------------------------
  const role = String(profile?.role || "user");
  const isEditorOrAdmin = role === "editor" || role === "admin";

  const [fansCount, setFansCount] = useState(0);
  const [myPublishedCount, setMyPublishedCount] = useState(0);
  const [latestComments, setLatestComments] = useState([]);
  const [latestLoading, setLatestLoading] = useState(true);

  useEffect(() => {
    if (!isEditorOrAdmin || !user?.uid) {
      setFansCount(0);
      return;
    }

    const ref = collection(db, "users", user.uid, "followers");
    const unsub = onSnapshot(
      ref,
      (snap) => setFansCount(snap.size),
      (e) => {
        console.error("[MyPage] fans error:", e);
        setFansCount(0);
      }
    );
    return () => unsub();
  }, [isEditorOrAdmin, user?.uid]);

  useEffect(() => {
    const email = String(user?.email || "").trim();
    if (!isEditorOrAdmin || !email) {
      setMyPublishedCount(0);
      return;
    }

    const qy = query(
      collection(db, "articles"),
      where("status", "==", "published"),
      where("authorEmail", "==", email)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => setMyPublishedCount(snap.size),
      (e) => {
        console.error("[MyPage] my articles error:", e);
        setMyPublishedCount(0);
      }
    );

    return () => unsub();
  }, [isEditorOrAdmin, user?.email]);

  useEffect(() => {
    const email = String(user?.email || "").trim();
    if (!isEditorOrAdmin || !email) {
      setLatestComments([]);
      setLatestLoading(false);
      return;
    }

    // ✅ CommentSection에 articleAuthorEmail 저장한 이후부터 정상적으로 잡힘
    // 기존 댓글은 field 없을 수 있음(정상)
    setLatestLoading(true);

    const qy = query(
      collection(db, "comments"),
      where("articleAuthorEmail", "==", email),
      orderBy("createdAt", "desc"),
      limit(12)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLatestComments(list);
        setLatestLoading(false);
      },
      (e) => {
        console.error("[MyPage] latest comments error:", e);
        setLatestComments([]);
        setLatestLoading(false);
      }
    );

    return () => unsub();
  }, [isEditorOrAdmin, user?.email]);

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
        isDarkMode ? "bg-black text-white" : "bg-[#f7f5f0] text-black"
      } min-h-screen`}
    >
      <div className="relative overflow-hidden">
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDarkMode
              ? "bg-[radial-gradient(circle_at_top_left,rgba(0,74,173,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_22%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(0,74,173,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,0,0,0.04),transparent_18%)]"
          }`}
        />

        <div className="relative max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10 lg:py-14">
          {/* HERO */}
          <section
            className={`rounded-[32px] border overflow-hidden ${
              isDarkMode
                ? "border-zinc-800 bg-zinc-950/90"
                : "border-black/10 bg-white/90"
            } backdrop-blur-xl`}
          >
            <div className="grid xl:grid-cols-12">
              <div className="xl:col-span-8 p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="text-[10px] tracking-[0.55em] uppercase italic font-black opacity-55">
                      / MY# ARCHIVE
                    </div>
                    <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-[-0.06em] uppercase leading-[0.88]">
                      Your
                      <br />
                      Reader Identity
                    </h1>
                    <p className="mt-4 max-w-[640px] text-sm sm:text-[15px] leading-6 opacity-70">
                      저장한 글, 활동 기록, 스티커와 업적, 그리고 에디터라면
                      독자 반응까지. U# 안에서의 취향과 흔적을 한 화면에 모아둔
                      개인 아카이브입니다.
                    </p>
                  </div>

                  <div
                    className={`min-w-[220px] rounded-[26px] border p-4 sm:p-5 ${
                      isDarkMode
                        ? "border-zinc-800 bg-white/[0.03]"
                        : "border-black/10 bg-[#f6f4ee]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-black opacity-40">
                            U#
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[10px] tracking-[0.38em] uppercase font-black opacity-45">
                          Signed In
                        </div>
                        <div className="mt-1 text-lg sm:text-xl font-black truncate">
                          {profile?.nickname || user.displayName || "U# User"}
                        </div>
                        <div className="mt-1 text-xs opacity-55 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <TierBadge
                        tierLabel={profile?.tierLabel || profile?.tier}
                        tierColor={profile?.tierColor}
                        level={level}
                      />

                      {profile?.nicknameChanged ? (
                        <span
                          className={`text-[10px] font-black px-3 py-1.5 rounded-full tracking-[0.2em] uppercase ${
                            isDarkMode
                              ? "bg-zinc-900 text-zinc-300"
                              : "bg-black/5 text-zinc-700"
                          }`}
                        >
                          locked
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full tracking-[0.2em] uppercase bg-[#004aad] text-white">
                          change 1x
                        </span>
                      )}

                      {hasFirstSave && (
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full tracking-[0.2em] uppercase bg-[#004aad]/15 text-[#004aad]">
                          first save
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <HeroMetricCard
                    label="XP"
                    value={`${xp}`}
                    sub="reader score"
                    isDarkMode={isDarkMode}
                  />
                  <HeroMetricCard
                    label="LEVEL"
                    value={`Lv ${level}`}
                    sub="current tier"
                    isDarkMode={isDarkMode}
                  />
                  <HeroMetricCard
                    label="STREAK"
                    value={`${streak}`}
                    sub="day streak"
                    isDarkMode={isDarkMode}
                  />
                  <HeroMetricCard
                    label="SAVED"
                    value={`${savedList.length}`}
                    sub="articles kept"
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>

              <div
                className={`xl:col-span-4 p-6 sm:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l ${
                  isDarkMode
                    ? "border-zinc-800 bg-white/[0.02]"
                    : "border-black/10 bg-black/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-55">
                    TODAY
                  </div>
                  <div className="text-[11px] opacity-55">
                    {dailyLoading ? "loading…" : yyyymmddLocal(new Date())}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniStat k="👁" v={dailyCounts.views} isDarkMode={isDarkMode} />
                  <MiniStat k="❤️" v={dailyCounts.likes} isDarkMode={isDarkMode} />
                  <MiniStat k="💬" v={dailyCounts.comments} isDarkMode={isDarkMode} />
                  <MiniStat k="🗳️" v={dailyCounts.votes} isDarkMode={isDarkMode} />
                  <MiniStat k="🔖" v={dailyCounts.saves} isDarkMode={isDarkMode} />
                  <MiniStat k="🔗" v={dailyCounts.shares} isDarkMode={isDarkMode} />
                </div>

                <p className="mt-4 text-[12px] leading-5 opacity-60">
                  오늘의 반응과 행동은 자동으로 기록됩니다. 자주 읽고,
                  저장하고, 공유할수록 U# 안의 리더 프로필이 더 또렷해집니다.
                </p>
              </div>
            </div>
          </section>

          {/* QUICK PANELS */}
          <section className="mt-6 grid xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <SectionShell
                title="Nickname Studio"
                subtitle="닉네임은 한 번만 바꿀 수 있어요. 댓글과 활동에 표시되는 이름입니다."
                isDarkMode={isDarkMode}
              >
                <div className="grid lg:grid-cols-12 gap-4 items-end">
                  <div className="lg:col-span-8">
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      disabled={!canChange || savingNick}
                      className={[
                        "w-full px-5 py-4 rounded-[22px] border bg-transparent text-sm sm:text-[15px] font-black outline-none transition",
                        isDarkMode
                          ? "border-zinc-800 focus:border-[#004aad]"
                          : "border-black/10 focus:border-[#004aad]",
                        !canChange || savingNick ? "opacity-60" : "",
                      ].join(" ")}
                      placeholder="닉네임 입력"
                    />
                    <div className="mt-3 text-xs opacity-60">
                      닉네임은 <b>2자 이상 20자 이하</b>, 공백 없이 설정할 수
                      있습니다.
                    </div>
                    {err && (
                      <div className="mt-2 text-sm font-black text-red-500">
                        {err}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-4 flex lg:justify-end">
                    <button
                      onClick={saveNickname}
                      disabled={!canChange || savingNick}
                      className={[
                        "w-full lg:w-auto min-w-[150px] px-6 py-4 rounded-[22px] font-black text-xs tracking-[0.38em] uppercase italic transition",
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
              </SectionShell>
            </div>

            <div className="xl:col-span-5">
              <SectionShell
                title="Collected Signals"
                subtitle="지금까지 쌓은 리더 흔적을 빠르게 훑어볼 수 있어요."
                isDarkMode={isDarkMode}
              >
                <div className="grid grid-cols-2 gap-3">
                  <ProfileChip
                    label="Saved"
                    value={`${savedList.length}`}
                    isDarkMode={isDarkMode}
                  />
                  <ProfileChip
                    label="Stickers"
                    value={`${myStickerIds.length}`}
                    isDarkMode={isDarkMode}
                  />
                  <ProfileChip
                    label="Achievements"
                    value={`${achIds.length}`}
                    isDarkMode={isDarkMode}
                  />
                  <ProfileChip
                    label="Following"
                    value={`${followingEditors.length}`}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </SectionShell>
            </div>
          </section>

          {/* EDITOR DASHBOARD */}
          {isEditorOrAdmin && (
            <>
              <section className="mt-6">
                <SectionShell
                  title="Editor Dashboard"
                  subtitle="독자 반응과 최근 대화, 발행 현황을 빠르게 확인하는 에디터 전용 보드입니다."
                  right={
                    <div className="text-[11px] font-black tracking-[0.28em] uppercase opacity-55">
                      {role}
                    </div>
                  }
                  isDarkMode={isDarkMode}
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    <HeroMetricCard
                      label="FANS"
                      value={`${fansCount}`}
                      sub="followers"
                      isDarkMode={isDarkMode}
                    />
                    <HeroMetricCard
                      label="PUBLISHED"
                      value={`${myPublishedCount}`}
                      sub="live articles"
                      isDarkMode={isDarkMode}
                    />
                    <HeroMetricCard
                      label="EMAIL"
                      value={`${user.email || "-"}`}
                      sub="author account"
                      isDarkMode={isDarkMode}
                    />
                  </div>

                  <div className="mt-6">
                    <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-55">
                      Latest Comments
                    </div>

                    {latestLoading ? (
                      <div className="mt-4 text-sm opacity-70">
                        불러오는 중…
                      </div>
                    ) : latestComments.length === 0 ? (
                      <div className="mt-4 text-sm opacity-70">
                        아직 잡힌 댓글이 없어요. 새 댓글부터 자동 반영됩니다.
                      </div>
                    ) : (
                      <div className="mt-4 grid lg:grid-cols-2 gap-3">
                        {latestComments.map((c) => (
                          <CommentCard
                            key={c.id}
                            comment={c}
                            isDarkMode={isDarkMode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </SectionShell>
              </section>

              <div className="mt-6">
                <EditorContentDashboard
                  userEmail={user?.email || ""}
                  isDarkMode={isDarkMode}
                />
              </div>
            </>
          )}

          {/* MAIN CONTENT GRID */}
          <section className="mt-6 grid xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7 space-y-6">
              <SectionShell
                title="Saved Articles"
                subtitle="저장한 글을 더 매거진처럼, 한 번에 훑어볼 수 있는 개인 아카이브입니다."
                right={
                  <div className="text-xs font-black opacity-60">
                    {savingLoading ? "…" : `${savedList.length}`}
                  </div>
                }
                isDarkMode={isDarkMode}
              >
                {!authUser ? (
                  <div className="text-sm opacity-70">
                    저장 목록은 로그인 후 확인할 수 있어요.
                  </div>
                ) : savingLoading ? (
                  <div className="text-sm opacity-70">불러오는 중…</div>
                ) : savedList.length === 0 ? (
                  <div className="text-sm opacity-70">
                    아직 저장한 글이 없어요. 아티클에서 <b>SAVE</b>를 눌러
                    보세요.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {savedList.map((s) => {
                      const editionNo = String(s.editionNo || s.id);
                      return (
                        <SavedArticleCard
                          key={editionNo}
                          article={s}
                          editionNo={editionNo}
                          onRemove={removeSaved}
                          isDarkMode={isDarkMode}
                        />
                      );
                    })}
                  </div>
                )}
              </SectionShell>

              <SectionShell
                title="Following Editors"
                subtitle="팬이 된 에디터를 모아보는 영역입니다."
                right={
                  <div className="text-xs font-black opacity-60">
                    {followingLoading ? "…" : `${followingEditors.length}`}
                  </div>
                }
                isDarkMode={isDarkMode}
              >
                {followingLoading ? (
                  <div className="text-sm opacity-70">불러오는 중…</div>
                ) : followingEditors.length === 0 ? (
                  <div className="text-sm opacity-70">
                    아직 팬이 된 에디터가 없어요. 아티클 하단에서 “팬 되기”를
                    눌러보세요.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {followingEditors.map((e) => (
                      <FollowingEditorCard
                        key={e.id}
                        item={e}
                        onUnfollow={unfollow}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </div>
                )}
              </SectionShell>
            </div>

            <div className="xl:col-span-5 space-y-6">
              <SectionShell
                title="Sticker Collection"
                subtitle={
                  stickersLoading
                    ? "불러오는 중…"
                    : `보유 스티커 ${myStickerIds.length}개`
                }
                isDarkMode={isDarkMode}
              >
                <StickerGrid ownedIds={myStickerIds} isDarkMode={isDarkMode} />
              </SectionShell>

              <SectionShell
                title="Achievements"
                subtitle={
                  achLoading
                    ? "업적을 불러오는 중…"
                    : `보유 업적 ${achIds.length}개`
                }
                isDarkMode={isDarkMode}
              >
                {achLoading ? (
                  <div className="text-sm opacity-70">
                    업적을 불러오는 중…
                  </div>
                ) : (
                  <AchievementGrid
                    ownedAchievements={achItems}
                    title="My Achievements"
                  />
                )}
              </SectionShell>
            </div>
          </section>
        </div>
      </div>

      {/* Intro Modal */}
      {showIntro && canChange && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/60 p-6">
          <div
            className={`w-full max-w-lg rounded-[30px] p-8 border ${
              isDarkMode
                ? "bg-zinc-950 border-zinc-800"
                : "bg-white border-black/10"
            }`}
          >
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Welcome
            </div>
            <div className="mt-3 text-2xl font-black italic tracking-tighter uppercase">
              Set your nickname
            </div>
            <div className="mt-3 text-sm opacity-70">
              닉네임은 <b>1회만 변경</b>할 수 있어요. 댓글과 활동에 이 이름이
              표시됩니다.
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

/* ---------- UI helpers ---------- */

function SectionShell({ title, subtitle, right = null, children, isDarkMode }) {
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
            / {title}
          </div>
          {subtitle ? (
            <div className="mt-2 text-sm leading-6 opacity-70">{subtitle}</div>
          ) : null}
        </div>
        {right}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function HeroMetricCard({ label, value, sub, isDarkMode }) {
  return (
    <div
      className={`rounded-[24px] border px-4 py-4 sm:px-5 sm:py-5 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="text-[10px] tracking-[0.38em] uppercase italic font-black opacity-50">
        {label}
      </div>
      <div className="mt-2 text-xl sm:text-2xl font-black tracking-tight break-all">
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] opacity-50">{sub}</div> : null}
    </div>
  );
}

function ProfileChip({ label, value, isDarkMode }) {
  return (
    <div
      className={`rounded-[22px] border px-4 py-4 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="text-[10px] tracking-[0.35em] uppercase font-black opacity-45">
        {label}
      </div>
      <div className="mt-2 text-lg font-black">{value}</div>
    </div>
  );
}

function SavedArticleCard({ article, editionNo, onRemove, isDarkMode }) {
  const img = coverUrlOfSaved(article);

  return (
    <div
      className={`group rounded-[26px] overflow-hidden border ${
        isDarkMode
          ? "border-zinc-800 bg-zinc-950"
          : "border-black/10 bg-[#fcfbf8]"
      }`}
    >
      <Link to={`/article/${editionNo}`} className="block">
        <div className="aspect-[1.2/1] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          {img ? (
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.035]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
              No Cover
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 text-[10px] font-black italic tracking-[0.38em] uppercase opacity-55">
            <span>#{padEdition(editionNo)}</span>
            <span className="text-[#004aad]">{article.category || "—"}</span>
          </div>

          <div className="mt-3 text-xl sm:text-[22px] leading-[1.02] font-black italic tracking-[-0.04em] line-clamp-3">
            {article.title || "Untitled"}
          </div>

          {article.subtitle ? (
            <div className="mt-3 text-sm leading-6 opacity-65 line-clamp-2">
              {article.subtitle}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex justify-end">
        <button
          onClick={() => onRemove(editionNo)}
          className={`text-[10px] font-black tracking-[0.35em] uppercase italic px-4 py-2.5 rounded-full border transition ${
            isDarkMode
              ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              : "border-black/10 text-zinc-700 hover:bg-black/5"
          }`}
          type="button"
        >
          UNSAVE
        </button>
      </div>
    </div>
  );
}

function FollowingEditorCard({ item, onUnfollow, isDarkMode }) {
  return (
    <div
      className={`rounded-[24px] border p-5 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.35em] uppercase font-black opacity-45">
            Editor
          </div>
          <div className="mt-2 text-lg font-black line-clamp-1">
            {item.editorName || "Editor"}
          </div>
          <div className="mt-1 text-xs opacity-55 line-clamp-1">
            {item.editorEmail
              ? item.editorEmail.replace(/(.{2}).+@/, "$1***@")
              : "—"}
          </div>
        </div>

        <button
          onClick={() => onUnfollow(item.id)}
          className={`text-[10px] font-black tracking-[0.35em] uppercase italic px-3 py-2 rounded-full border transition ${
            isDarkMode
              ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              : "border-black/10 text-zinc-700 hover:bg-black/5"
          }`}
          type="button"
        >
          UNFOLLOW
        </button>
      </div>
    </div>
  );
}

function CommentCard({ comment, isDarkMode }) {
  return (
    <div
      className={`rounded-[24px] border p-4 sm:p-5 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black line-clamp-1">
          {comment.articleTitle || `#${padEdition(comment.editionNo)}`}
        </div>
        <div className="text-[11px] opacity-50 shrink-0">
          {timeAgo(comment.createdAt)}
        </div>
      </div>

      <div className="mt-3 text-sm leading-6 opacity-80 line-clamp-3">
        <b className="mr-2">{comment.nickname || "익명"}</b>
        {comment.text || ""}
      </div>

      {comment.editionNo && (
        <div className="mt-4">
          <Link
            to={`/article/${String(comment.editionNo)}`}
            className="text-[11px] font-black tracking-[0.25em] uppercase italic text-[#004aad]"
          >
            OPEN ARTICLE →
          </Link>
        </div>
      )}
    </div>
  );
}

function MiniStat({ k, v, isDarkMode }) {
  return (
    <div
      className={`rounded-[18px] border px-3 py-3 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-white/70"
      }`}
    >
      <div className="text-[11px] font-black opacity-65">{k}</div>
      <div className="mt-1 text-sm font-black">{v}</div>
    </div>
  );
}}