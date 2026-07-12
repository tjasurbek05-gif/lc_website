"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Brand logo for "Brian".
 * Automatically switches between black and white versions based on theme.
 */
export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-detect dark mode
  const isDark = mounted && theme === "dark";
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
