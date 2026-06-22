import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Brand logo + wordmark.
 *
 * 👉 PLACEHOLDER: replace the gradient icon box below with the learning
 * center's real logo (e.g. an <Image src="/logo.svg" />) and update the
 * wordmark text. The layout will adapt automatically.
 */
export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
        <GraduationCap className="size-5" />
      </span>
      <span
        className={cn(
          "text-lg font-bold tracking-tight",
          variant === "light" ? "text-white" : "text-foreground",
        )}
      >
        Learn<span className="text-indigo-500">Center</span>
      </span>
    </span>
  );
}
