import SectionShell from "./SectionShell";
import FollowingEditorCard from "./FollowingEditorCard";

export default function FollowingEditorsSection({ followingLoading, followingEditors, followingEditorProfiles, unfollow, isDarkMode }) {
  return (
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
              profile={followingEditorProfiles[e.id]}
              onUnfollow={unfollow}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}
    </SectionShell>
  );
}
