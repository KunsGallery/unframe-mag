export default function SectionShell({ title, subtitle, right = null, children, isDarkMode }) {
  return (
    <section
      className={`rounded-[30px] border p-5 sm:p-6 lg:p-8 ${
        isDarkMode
          ? "border-zinc-800 bg-zinc-950/80"
          : "border-black/10 bg-white/90"
      } backdrop-blur-xl`}
    >
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-55">
            / {title}
          </div>
          {subtitle ? (
            <div className="mt-2 text-sm leading-6 opacity-70">{subtitle}</div>
          ) : null}
        </div>
        {right}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
