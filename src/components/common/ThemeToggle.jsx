import React from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ isDarkMode, onToggle, className = "", compact = false }) {
  return (
    <button
      onClick={onToggle}
      className={[
        compact
          ? "w-11 h-11 rounded-md flex items-center justify-center text-zinc-500 hover:bg-[#004aad]/5 hover:text-[#004aad] transition-colors group"
          : "w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--uf-surface)] text-zinc-400 hover:text-[#004aad] transition-all shadow-inner group",
        className,
      ].join(" ")}
      type="button"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDarkMode}
      title={isDarkMode ? "Light mode" : "Dark mode"}
    >
      {isDarkMode ? (
        <Sun size={compact ? 20 : 24} className="motion-safe:group-hover:rotate-90 motion-safe:transition-transform duration-300" />
      ) : (
        <Moon size={compact ? 20 : 24} className="motion-safe:group-hover:-rotate-12 motion-safe:transition-transform duration-300" />
      )}
    </button>
  );
}
