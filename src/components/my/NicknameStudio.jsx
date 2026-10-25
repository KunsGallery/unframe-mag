import SectionShell from "./SectionShell";

export default function NicknameStudio({ nickname, setNickname, canChange, savingNick, err, saveNickname, isDarkMode }) {
  return (
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
  );
}
