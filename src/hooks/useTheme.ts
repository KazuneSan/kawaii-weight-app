import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "app_theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  // Tailwind の dark クラス切替
  root.classList.toggle("dark", isDark);

  // UA へのヒント（フォームやスクロールバーなどの自動ダーク化を抑止/適用）
  // ライト選択時は 'light' を強制、ダーク選択時は 'dark'、システム時は 'light dark'
  // ※ style.colorScheme は meta より優先される
  (root.style as any).colorScheme = theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark";
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