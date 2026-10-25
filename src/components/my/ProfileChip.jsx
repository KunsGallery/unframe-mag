export default function ProfileChip({ label, value, isDarkMode }) {
  return (
    <div
      className={`rounded-[22px] border px-4 py-4 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="text-[10px] tracking-[0.35em] uppercase font-black opacity-45">
        {label}
      </div>
      <div className="mt-2 text-lg font-black">{value}</div>
    </div>
  );
}
