import SectionShell from "./SectionShell";
import SavedArticleCard from "./SavedArticleCard";

export default function SavedArticlesSection({ authUser, savingLoading, savedList, removeSaved, isDarkMode }) {
  return (
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
  );
}
