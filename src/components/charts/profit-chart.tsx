"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export type ProfitDatum = {
  label: string;
  revenue: number;
  cost: number;
  profit: number;
};

/**
 * CEO profit & loss: grouped bars for revenue (in) and total cost (out) with a
 * net-profit line drawn on top. Matches the app's themed chart styling.
 */
export function ProfitChart({
  data,
  labels,
  locale = "en",
}: {
  data: ProfitDatum[];
  labels: { revenue: string; cost: string; profit: string };
  locale?: string;
}) {
  const nameByKey: Record<string, string> = {
    revenue: labels.revenue,
    cost: labels.cost,
    profit: labels.profit,
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickFormatter={(v: number) =>
            Math.abs(v) >= 1_000_000
              ? `${v / 1_000_000}M`
              : Math.abs(v) >= 1_000
                ? `${v / 1_000}K`
                : `${v}`
          }
        />
        <ReferenceLine y={0} stroke="var(--color-border)" />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--color-popover-foreground)",
          }}
          formatter={(value, name) => [
            formatCurrency(Number(value), locale),
            nameByKey[String(name)] ?? name,
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => nameByKey[String(value)] ?? value}
          wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
        />
        <Bar dataKey="revenue" fill="var(--color-success)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="cost" fill="var(--color-warning)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--color-primary)" }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
