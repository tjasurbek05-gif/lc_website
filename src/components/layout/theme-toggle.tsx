"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";

const THEMES = ["orange", "light", "dark"] as const;
type ThemeId = (typeof THEMES)[number];

function ThemeIcon({ id, className }: { id: ThemeId; className?: string }) {
  if (id === "dark") return <Moon className={className} />;
  if (id === "light") return <Sun className={className} />;
  return (
    <span
      aria-hidden
      className={cn("inline-block rounded-full bg-[#ea580c]", className)}
    />
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  // `theme` is undefined until next-themes resolves the stored/default value;
  // treating that as "orange" (the default) keeps the first client render in
  // sync with what the server rendered, avoiding a hydration mismatch.
  const current = (theme as ThemeId | undefined) ?? "orange";

  return (
    <Dropdown
      trigger={
        <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ThemeIcon id={current} className="size-4" />
        </span>
      }
    >
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {t("label")}
      </p>
      {THEMES.map((id) => (
        <DropdownItem key={id} active={current === id} onClick={() => setTheme(id)}>
          <ThemeIcon id={id} className="size-4" />
          <span className="flex-1">{t(id)}</span>
          {current === id ? <Check className="size-4 text-primary" /> : null}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
