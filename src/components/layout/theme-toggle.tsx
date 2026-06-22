"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // Theme is represented purely by the `dark` class on <html> (set before paint
  // by the inline script in the root layout). Toggling reads/writes that class,
  // so no React state or effect is needed; the correct icon is shown via CSS.
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}
