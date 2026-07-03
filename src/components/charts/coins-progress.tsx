"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export type WeekPoint = { label: string; coins: number };
export type ProgressChunk = { key: string; label: string; weeks: WeekPoint[] };

/**
 * Weekly coins collected, with the whole study period split into 3-month
 * chunks. Each chunk is a tab; the chart plots one bar per week in that chunk.
 */
export function CoinsProgress({ chunks }: { chunks: ProgressChunk[] }) {
  const t = useTranslations("student");
  const [active, setActive] = useState(chunks.length - 1);
  const chunk = chunks[active];

  return (
    <div>
      {chunks.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {chunks.map((c, i) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                i === active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chunk.weeks}
          margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={42}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <ReferenceLine y={0} stroke="var(--color-border)" />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--color-popover-foreground)",
            }}
            labelStyle={{ color: "var(--color-muted-foreground)" }}
            formatter={(value) => [`${value}`, t("coins")]}
          />
          <Bar dataKey="coins" radius={[4, 4, 0, 0]}>
            {chunk.weeks.map((w, i) => (
              <Cell
                key={i}
                fill={
                  w.coins < 0 ? "var(--color-destructive)" : "var(--color-primary)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
