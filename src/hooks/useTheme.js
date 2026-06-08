import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "uf_theme_preference";
const THEME_QUERY = "(prefers-color-scheme: dark)";

function readStoredPreference() {
  if (typeof window === "undefined") return "system";

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "system";
  } catch {
    return "system";
  }
}

function getSystemPrefersDark() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(THEME_QUERY).matches;
}

function getResolvedTheme(preference, systemPrefersDark) {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark ? "dark" : "light";
}

function syncDocumentTheme(resolvedTheme) {
  if (typeof document === "undefined") return;

  const isDark = resolvedTheme === "dark";
  const root = document.documentElement;
  const body = document.body;
  const themeColor = isDark ? "#09090b" : "#fcfcfc";
  const textColor = isDark ? "#f4f4f5" : "#111111";

  root.classList.toggle("dark", isDark);
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  root.style.backgroundColor = themeColor;
  root.style.color = textColor;

  if (body) {
    body.classList.toggle("dark", isDark);
    body.dataset.theme = resolvedTheme;
    body.style.colorScheme = resolvedTheme;
    body.style.backgroundColor = themeColor;
    body.style.color = textColor;
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", themeColor);

  const backgroundMeta = document.querySelector('meta[name="background-color"]');
  if (backgroundMeta) backgroundMeta.setAttribute("content", themeColor);
}

export function useTheme() {
  const [themePreference, setThemePreference] = useState(() => readStoredPreference());
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => getSystemPrefersDark());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const media = window.matchMedia(THEME_QUERY);
    const sync = () => setSystemPrefersDark(media.matches);

    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  const resolvedTheme = useMemo(
    () => getResolvedTheme(themePreference, systemPrefersDark),
    [themePreference, systemPrefersDark]
  );

  useEffect(() => {
    syncDocumentTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setThemePreferenceAndPersist = (nextPreference) => {
    const next =
      nextPreference === "light" || nextPreference === "dark" || nextPreference === "system"
        ? nextPreference
        : "system";

    setThemePreference(next);

    if (typeof window === "undefined") return;

    try {
      if (next === "system") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Storage can be unavailable in private or restricted contexts.
    }
  };

  const toggleTheme = () => {
    setThemePreferenceAndPersist(resolvedTheme === "dark" ? "light" : "dark");
  };

  return {
    themePreference,
    resolvedTheme,
    isDarkMode: resolvedTheme === "dark",
    setThemePreference: setThemePreferenceAndPersist,
    toggleTheme,
  };
}

