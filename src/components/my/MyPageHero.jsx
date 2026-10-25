import UploadButton from "../editor/UploadButton";
import TierBadge from "./TierBadge";
import HeroMetricCard from "./HeroMetricCard";
import MiniStat from "./MiniStat";
import { yyyymmddLocal } from "../../lib/myPageFormat";

export default function MyPageHero({ isDarkMode, user, profile, profilePhotoURL, profileName, profileInitials, photoUploading, photoProgress, saveProfilePhoto, hasFirstSave, xp, level, streak, savedCount, dailyLoading, dailyCounts }) {
  return (
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
                  {profilePhotoURL ? (
                    <img
                      src={profilePhotoURL}
                      alt={profileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-black opacity-40">
                      {profileInitials}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] tracking-[0.38em] uppercase font-black opacity-45">
                    Signed In
                  </div>
                  <div className="mt-1 text-lg sm:text-xl font-black truncate">
                    {profileName}
                  </div>
                  <div className="mt-1 text-xs opacity-55 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <UploadButton
                  label="Photo"
                  title="Upload profile photo"
                  uploading={photoUploading}
                  progress={photoProgress}
                  onPickFile={saveProfilePhoto}
                />
                <div className="text-[11px] opacity-55">
                  {photoUploading
                    ? `업로드 중 ${Math.min(100, Math.max(0, photoProgress || 0))}%`
                    : "프로필 사진을 바꿀 수 있어요."}
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
              value={`${savedCount}`}
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
  );
}
