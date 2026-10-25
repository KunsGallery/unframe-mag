export default function MiniStat({ k, v, isDarkMode }) {
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
}
