"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Brand logo for "Brian". Switches between black and white artwork based on
 * the active theme, or forced white via `variant="light"` for placement on
 * a permanently-dark surface (e.g. the app sidebar).
 */
export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  const { theme } = useTheme();
  const isDark = variant === "light" || theme === "dark";
  const logoSrc = isDark ? "/logo-white.png" : "/logo-black.png";

  return (
    <span className={cn("flex items-center", className)}>
      <img
        src={logoSrc}
        alt="Brian"
        draggable={false}
        className="h-7 w-auto select-none"
      />
    </span>
  );
}
