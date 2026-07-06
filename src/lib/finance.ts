// Finance calculations for tuition payments and teacher payouts. Framework-
// agnostic and pure, mirroring the style of lib/metrics.ts.

export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";

export type PaymentLike = {
  amount: number;
  dueDate: Date | string;
  paidAt: Date | string | null;
};

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/**
 * Add one calendar month to a date, clamping the day so month-end dates
 * don't overflow (e.g. Jan 31 + 1 month = Feb 28/29, not Mar 3).
 */
export function addOneMonth(date: Date | string): Date {
  const d = toDate(date);
  const day = d.getDate();
  const next = new Date(d);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDayOfNextMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, lastDayOfNextMonth));
  return next;
}

/** "YYYY-MM" period key for a date, used to identify a payout month. */
export function monthPeriod(date: Date | string): string {
  const d = toDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Current "YYYY-MM" period. */
export function currentPeriod(now: Date = new Date()): string {
  return monthPeriod(now);
}

/** Short label for a "YYYY-MM" period, e.g. "Jul 2026". */
export function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/** A cycle's status is derived, never stored: paid, still pending, or overdue. */
export function paymentStatus(
  payment: PaymentLike,
  now: Date = new Date(),
): PaymentStatus {
  if (payment.paidAt) return "PAID";
  return toDate(payment.dueDate).getTime() < now.getTime() ? "OVERDUE" : "PENDING";
}

export type StandingStatus = "GOOD" | "OVERDUE" | "NONE";

/**
 * A student's overall standing: "NONE" if no cycle was ever recorded, else
 * derived from their one open (unpaid) cycle — "OVERDUE" past its due date,
 * "GOOD" otherwise (paid up through the current cycle).
 */
export function studentStandingStatus(
  payments: PaymentLike[],
  now: Date = new Date(),
): StandingStatus {
  if (payments.length === 0) return "NONE";
  const open = payments.find((p) => !p.paidAt);
  if (!open) return "GOOD";
  return paymentStatus(open, now) === "OVERDUE" ? "OVERDUE" : "GOOD";
}

export type RevenuePoint = { key: string; label: string; total: number };

/** Total amount collected per calendar month (by paidAt), oldest first. */
export function monthlyRevenue(payments: { amount: number; paidAt: Date | string | null }[]): RevenuePoint[] {
  const byMonth = new Map<string, number>();
  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = monthPeriod(p.paidAt);
    byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => ({ key, label: periodLabel(key), total }));
}

/** Sum of amounts paid within a given "YYYY-MM" period. */
export function revenueForPeriod(
  payments: { amount: number; paidAt: Date | string | null }[],
  period: string,
): number {
  return payments
    .filter((p) => p.paidAt && monthPeriod(p.paidAt) === period)
    .reduce((sum, p) => sum + p.amount, 0);
}

/* --------------------------- Payroll & profit --------------------------- */

export type PayoutLike = { amount: number; period: string; paidAt: Date | string | null };

/** Total salaries actually paid out within a given "YYYY-MM" period. */
export function payrollForPeriod(payouts: PayoutLike[], period: string): number {
  return payouts
    .filter((p) => p.paidAt && p.period === period)
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Total salaries paid per period (by the payout's own period), oldest first. */
export function monthlyPayroll(payouts: PayoutLike[]): RevenuePoint[] {
  const byMonth = new Map<string, number>();
  for (const p of payouts) {
    if (!p.paidAt) continue;
    byMonth.set(p.period, (byMonth.get(p.period) ?? 0) + p.amount);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => ({ key, label: periodLabel(key), total }));
}

export type ProfitPoint = {
  key: string;
  label: string;
  revenue: number;
  payroll: number;
  profit: number;
};

/**
 * Per-month revenue, salary payroll and net profit (revenue − payroll) across
 * the union of months that had either revenue or payroll, oldest first. This
 * is the CEO's cash-based P&L: money collected from students minus salaries
 * actually paid to teachers.
 */
export function monthlyProfit(
  payments: { amount: number; paidAt: Date | string | null }[],
  payouts: PayoutLike[],
): ProfitPoint[] {
  const revenueByMonth = new Map<string, number>();
  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = monthPeriod(p.paidAt);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + p.amount);
  }
  const payrollByMonth = new Map<string, number>();
  for (const p of payouts) {
    if (!p.paidAt) continue;
    payrollByMonth.set(p.period, (payrollByMonth.get(p.period) ?? 0) + p.amount);
  }
  const keys = new Set([...revenueByMonth.keys(), ...payrollByMonth.keys()]);
  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const revenue = revenueByMonth.get(key) ?? 0;
      const payroll = payrollByMonth.get(key) ?? 0;
      return { key, label: periodLabel(key), revenue, payroll, profit: revenue - payroll };
    });
}
