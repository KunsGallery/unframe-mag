import SectionShell from "./SectionShell";
import HeroMetricCard from "./HeroMetricCard";
import CommentCard from "./CommentCard";

export default function EditorDashboardSection({ role, userEmail, fansCount, myPublishedCount, latestLoading, latestComments, latestCommentAuthors, isDarkMode }) {
  return (
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
          value={`${userEmail || "-"}`}
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
                authorProfile={latestCommentAuthors[c.authorUid]}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
