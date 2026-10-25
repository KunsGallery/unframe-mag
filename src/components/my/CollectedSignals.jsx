import SectionShell from "./SectionShell";
import ProfileChip from "./ProfileChip";

export default function CollectedSignals({ savedCount, stickerCount, achievementCount, followingCount, isDarkMode }) {
  return (
    <SectionShell
      title="Collected Signals"
      subtitle="지금까지 쌓은 리더 흔적을 빠르게 훑어볼 수 있어요."
      isDarkMode={isDarkMode}
    >
      <div className="grid grid-cols-2 gap-3">
        <ProfileChip
          label="Saved"
          value={`${savedCount}`}
          isDarkMode={isDarkMode}
        />
        <ProfileChip
          label="Stickers"
          value={`${stickerCount}`}
          isDarkMode={isDarkMode}
        />
        <ProfileChip
          label="Achievements"
          value={`${achievementCount}`}
          isDarkMode={isDarkMode}
        />
        <ProfileChip
          label="Following"
          value={`${followingCount}`}
          isDarkMode={isDarkMode}
        />
      </div>
    </SectionShell>
  );
}
