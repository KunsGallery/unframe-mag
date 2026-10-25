export default function NicknameIntroModal({ isDarkMode, onClose }) {
  return (
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
            onClick={onClose}
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
            onClick={onClose}
            className="px-4 py-3 rounded-2xl text-xs font-black tracking-[0.3em] uppercase italic bg-[#004aad] text-white"
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
