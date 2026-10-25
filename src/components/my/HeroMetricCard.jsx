export default function HeroMetricCard({ label, value, sub, isDarkMode }) {
  return (
    <div
      className={`rounded-[24px] border px-4 py-4 sm:px-5 sm:py-5 ${
        isDarkMode
          ? "border-zinc-800 bg-white/[0.03]"
          : "border-black/10 bg-black/[0.02]"
      }`}
    >
      <div className="text-[10px] tracking-[0.38em] uppercase italic font-black opacity-50">
        {label}
      </div>
      <div className="mt-2 text-xl sm:text-2xl font-black tracking-tight break-all">
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] opacity-50">{sub}</div> : null}
    </div>
  );
}
