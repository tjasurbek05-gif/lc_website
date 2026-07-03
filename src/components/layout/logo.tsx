import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Brand logo + wordmark for "Brian".
 *
 * A rounded badge carries the brand's signature up-right cursor/arrow, next to
 * the "Brian" wordmark. The wordmark uses currentColor so it reads correctly on
 * both the dark sidebar (variant="light") and the light top bar.
 *
 * To use an exact logo asset instead, drop it in `public/` (e.g. logo.svg) and
 * swap the badge below for `<Image src="/logo.svg" … />`.
 */
export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)} aria-label="Brian">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm">
        <Navigation className="size-[18px] rotate-45 fill-current" />
      </span>
      <span
        className={cn(
          "text-xl font-extrabold tracking-tight",
          variant === "light" ? "text-white" : "text-foreground",
        )}
      >
        Brian
      </span>
    </span>
  );
}
