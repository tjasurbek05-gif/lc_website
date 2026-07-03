import { cn } from "@/lib/utils";

/**
 * Brand logo for "Brian".
 *
 * Uses the real wordmark asset at `public/logo.png` (black mark on a
 * transparent background). On dark surfaces pass `variant="light"`, which
 * inverts the mark to white so it stays visible.
 */
export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  return (
    <span className={cn("flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Brian"
        draggable={false}
        className={cn("h-7 w-auto select-none", variant === "light" && "invert")}
      />
    </span>
  );
}
