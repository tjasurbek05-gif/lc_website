// Grade / performance calculations. Framework-agnostic and pure.

export type GradeLike = {
  value: number;
  maxValue: number;
  date: Date | string;
  type: string;
  subjectId: string;
};

const round = (n: number, dp = 1) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** A single grade as a percentage (0–100, one decimal). */
export function toPercent(value: number, maxValue: number): number {
  if (!maxValue || maxValue <= 0) return 0;
  return round((value / maxValue) * 100);
}

export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Average percentage across a set of grades. */
export function averagePercent(grades: GradeLike[]): number {
  return round(mean(grades.map((g) => toPercent(g.value, g.maxValue))));
}

export function letterGrade(percent: number): string {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

export function gpaFromPercent(percent: number): number {
  if (percent >= 90) return 4;
  if (percent >= 80) return 3;
  if (percent >= 70) return 2;
  if (percent >= 60) return 1;
  return 0;
}

/** Overall GPA (4.0 scale) across all grades. */
export function overallGpa(grades: GradeLike[]): number {
  return round(mean(grades.map((g) => gpaFromPercent(toPercent(g.value, g.maxValue)))), 2);
}

export type SubjectSummary = {
  subjectId: string;
  name: string;
  count: number;
  average: number;
  letter: string;
};

/** Per-subject average percentage and letter, sorted by subject name. */
export function summarizeBySubject(
  grades: GradeLike[],
  subjectNames: Map<string, string>,
): SubjectSummary[] {
  const bySubject = new Map<string, GradeLike[]>();
  for (const g of grades) {
    const list = bySubject.get(g.subjectId) ?? [];
    list.push(g);
    bySubject.set(g.subjectId, list);
  }
  const result: SubjectSummary[] = [];
  for (const [subjectId, list] of bySubject) {
    const average = averagePercent(list);
    result.push({
      subjectId,
      name: subjectNames.get(subjectId) ?? "—",
      count: list.length,
      average,
      letter: letterGrade(average),
    });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export type TrendPoint = { key: string; label: string; average: number };

/**
 * Average percentage grouped by calendar month, oldest first.
 * Useful for a student's progress line chart.
 */
export function monthlyTrend(grades: GradeLike[]): TrendPoint[] {
  const byMonth = new Map<string, GradeLike[]>();
  for (const g of grades) {
    const d = typeof g.date === "string" ? new Date(g.date) : g.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = byMonth.get(key) ?? [];
    list.push(g);
    byMonth.set(key, list);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const [year, month] = key.split("-").map(Number);
      const label = new Date(year, month - 1, 1).toLocaleString("en-US", {
        month: "short",
      });
      return { key, label, average: averagePercent(list) };
    });
}
