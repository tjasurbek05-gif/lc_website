import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initials for avatar fallbacks, e.g. "Ada Lovelace" -> "AL". */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function intlLocale(locale: string): string {
  return locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";
}

/** Format a date as a short, locale-aware string. */
export function formatDate(date: Date | string, locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Format an amount as a grouped number with the local currency word (UZS). */
export function formatCurrency(amount: number, locale = "en"): string {
  const rounded = Math.round(amount);
  const grouped = new Intl.NumberFormat(intlLocale(locale)).format(rounded);
  const suffix = locale === "ru" ? "сум" : "so'm";
  return `${grouped} ${suffix}`;
}

/** Format the time part, e.g. "15:00". */
export function formatTime(date: Date | string, locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Return a new date `n` days after `date` (does not mutate). */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Monday-based start of the week (00:00 local) for the given date.
 * Weekdays elsewhere use 1 = Monday … 7 = Sunday.
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  return addDays(d, diff);
}

/** ISO weekday 1 = Monday … 7 = Sunday for a date. */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/** Whether two dates fall on the same calendar day (local time). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
