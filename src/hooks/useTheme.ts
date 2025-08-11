import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "app_theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = (localStorage.getItem(KEY) as Theme) || "system";
    return saved;
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(KEY, theme);
    // システム変更に追従（system選択時のみ）
    const mm = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handler = () => theme === "system" && applyTheme("system");
    mm?.addEventListener?.("change", handler);
    return () => mm?.removeEventListener?.("change", handler);
  }, [theme]);

  return { theme, setTheme };
}