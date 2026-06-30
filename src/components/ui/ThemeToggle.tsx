"use client";

import { useEffect, useState } from "react";

// Persists via a cookie (read server-side in the root layout for no-flash SSR)
// plus localStorage. Default is dark; only an explicit toggle opts into light.
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const cur = (document.documentElement.dataset.theme as "light" | "dark") || "dark";
    setTheme(cur);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-arqud-line text-arqud-gold transition-colors hover:bg-arqud-gold/10"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
