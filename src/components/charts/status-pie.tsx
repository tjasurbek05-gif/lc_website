"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type StatusSlice = { key: string; label: string; value: number; color: string };

export function StatusPie({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={total > 0 ? 2 : 0}
          strokeWidth={0}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--color-popover-foreground)",
          }}
          formatter={(value, name) => {
            const n = Number(value);
            return [total > 0 ? `${n} (${Math.round((n / total) * 100)}%)` : `${n}`, name];
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
