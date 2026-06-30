import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "danger";
}) {
  // The icon chip uses a vivid gradient for a modern, energetic look.
  const accentClasses: Record<string, string> = {
    primary: "bg-brand-gradient text-white shadow-sm",
    success: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm",
    warning: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm",
    danger: "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm",
  };
  return (
    <Card className="relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
              accentClasses[accent],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
