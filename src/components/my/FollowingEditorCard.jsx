import { resolveProfileDisplayName } from "../../lib/profileImage";

export default function FollowingEditorCard({ item, profile, onUnfollow, isDarkMode }) {
  const displayName =
    resolveProfileDisplayName(profile, item, {
      displayName: item.editorName,
      name: item.editorName,
    }) || item.editorName || "Editor";
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
            {displayName}
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
