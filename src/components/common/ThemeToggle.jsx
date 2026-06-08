import React from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ isDarkMode, onToggle, className = "" }) {
  return (
    <button
      onClick={onToggle}
      className={[
        "w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--uf-surface)] text-zinc-400 hover:text-[#004aad] transition-all shadow-inner group",
        className,
      ].join(" ")}
      type="button"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDarkMode}
      title={isDarkMode ? "Light mode" : "Dark mode"}
    >
      {isDarkMode ? (
        <Sun size={24} className="group-hover:rotate-90 transition-all duration-700" />
      ) : (
        <Moon size={24} className="group-hover:-rotate-12 transition-all duration-700" />
      )}
    </button>
  );
}
