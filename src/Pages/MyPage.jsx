import React, { useMemo } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUserProfile } from "../hooks/useUserProfile";
import { useUploadImage } from "../hooks/useUploadImage";
import { useSavedArticles } from "../hooks/useSavedArticles";
import { useMyAchievements } from "../hooks/useMyAchievements";
import { useMyStickers } from "../hooks/useMyStickers";
import { useMyDailyStats } from "../hooks/useMyDailyStats";
import { useNicknameEditor } from "../hooks/useNicknameEditor";
import { useFollowingEditors } from "../hooks/useFollowingEditors";
import { useEditorDashboardStats } from "../hooks/useEditorDashboardStats";
import {
  getProfileInitials,
  resolveProfileDisplayName,
  resolveProfilePhotoURL,
} from "../lib/profileImage";

import StickerGrid from "../components/my/StickerGrid";
import AchievementGrid from "../components/my/AchievementGrid";
import EditorContentDashboard from "../components/my/EditorContentDashboard";
import SectionShell from "../components/my/SectionShell";
import MyPageHero from "../components/my/MyPageHero";
import NicknameStudio from "../components/my/NicknameStudio";
import CollectedSignals from "../components/my/CollectedSignals";
import EditorDashboardSection from "../components/my/EditorDashboardSection";
import SavedArticlesSection from "../components/my/SavedArticlesSection";
import FollowingEditorsSection from "../components/my/FollowingEditorsSection";
import NicknameIntroModal from "../components/my/NicknameIntroModal";

export default function MyPage({ isDarkMode, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));
  const { user, profile, loading } = useUserProfile();
  const { upload, uploading: photoUploading, progress: photoProgress } = useUploadImage();

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
  const profilePhotoURL = resolveProfilePhotoURL(profile, user);
  const profileName =
    resolveProfileDisplayName(profile, user) || user?.email || "U# User";
  const profileInitials = getProfileInitials(profileName);

  // Daily stats
  const { daily, dailyLoading } = useMyDailyStats(user?.uid);

  // Nickname
  const {
    nickname,
    setNickname,
    savingNick,
    err,
    showIntro,
    setShowIntro,
    canChange,
    saveNickname,
  } = useNicknameEditor({ user, profile, toast });

  const saveProfilePhoto = async (file) => {
    if (!user?.uid) {
      toast("프로필 사진은 로그인 후 업로드할 수 있어요.");
      return;
    }

    try {
      const { url } = await upload(file, { variant: "inline" });
      await setDoc(
        doc(db, "users", user.uid),
        {
          photoURL: url,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast("프로필 사진이 업데이트되었어요.");
    } catch (e) {
      console.error(e);
      toast(e?.userMessage || "프로필 사진 업로드 실패");
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
  const { followingEditors, followingLoading, followingEditorProfiles, unfollow } =
    useFollowingEditors(user?.uid, toast);

  // -----------------------------
  // NEW: Editor Dashboard (editor/admin만)
  // -----------------------------
  const role = String(profile?.role || "user");
  const isEditorOrAdmin = role === "editor" || role === "admin";

  const { fansCount, myPublishedCount, latestComments, latestLoading, latestCommentAuthors } =
    useEditorDashboardStats({ isEditorOrAdmin, uid: user?.uid, userEmail: user?.email });

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
        <div className="text-[var(--uf-muted)] font-black italic tracking-widest uppercase">
          Login Required
        </div>
        <div className="text-sm text-[var(--uf-muted)]">
          My#는 로그인 후 이용할 수 있어요.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--uf-bg)] text-[var(--uf-text)]">
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
          <MyPageHero
            isDarkMode={isDarkMode}
            user={user}
            profile={profile}
            profilePhotoURL={profilePhotoURL}
            profileName={profileName}
            profileInitials={profileInitials}
            photoUploading={photoUploading}
            photoProgress={photoProgress}
            saveProfilePhoto={saveProfilePhoto}
            hasFirstSave={hasFirstSave}
            xp={xp}
            level={level}
            streak={streak}
            savedCount={savedList.length}
            dailyLoading={dailyLoading}
            dailyCounts={dailyCounts}
          />

          {/* QUICK PANELS */}
          <section className="mt-6 grid xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <NicknameStudio
                nickname={nickname}
                setNickname={setNickname}
                canChange={canChange}
                savingNick={savingNick}
                err={err}
                saveNickname={saveNickname}
                isDarkMode={isDarkMode}
              />
            </div>

            <div className="xl:col-span-5">
              <CollectedSignals
                savedCount={savedList.length}
                stickerCount={myStickerIds.length}
                achievementCount={achIds.length}
                followingCount={followingEditors.length}
                isDarkMode={isDarkMode}
              />
            </div>
          </section>

          {/* EDITOR DASHBOARD */}
          {isEditorOrAdmin && (
            <>
              <section className="mt-6">
                <EditorDashboardSection
                  role={role}
                  userEmail={user.email}
                  fansCount={fansCount}
                  myPublishedCount={myPublishedCount}
                  latestLoading={latestLoading}
                  latestComments={latestComments}
                  latestCommentAuthors={latestCommentAuthors}
                  isDarkMode={isDarkMode}
                />
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
              <SavedArticlesSection
                authUser={authUser}
                savingLoading={savingLoading}
                savedList={savedList}
                removeSaved={removeSaved}
                isDarkMode={isDarkMode}
              />

              <FollowingEditorsSection
                followingLoading={followingLoading}
                followingEditors={followingEditors}
                followingEditorProfiles={followingEditorProfiles}
                unfollow={unfollow}
                isDarkMode={isDarkMode}
              />
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
        <NicknameIntroModal isDarkMode={isDarkMode} onClose={() => setShowIntro(false)} />
      )}
    </div>
  );
}
