import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  ATTENDANCE_STATUS,
  LESSON_STATUS,
  LESSON_TYPES,
  ROLES,
  WEEKDAY_KEYS,
  WEEKDAYS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { addDays, cn, formatDate, formatTime, isoWeekday, startOfWeek } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/page-header";

export default async function StudentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireRole(ROLES.STUDENT);
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("schedule");
  const tw = await getTranslations("weekdays");
  const tlt = await getTranslations("lessonTypes");

  const weekOffset = Number.parseInt(sp.week ?? "0", 10) || 0;
  const now = new Date();
  const weekStart = addDays(startOfWeek(now), weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);

  const [lessons, allAttendance] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        group: { students: { some: { id: session.userId } } },
        startAt: { gte: weekStart, lt: weekEnd },
      },
      include: {
        group: { select: { name: true, subject: { select: { name: true } } } },
        room: { select: { name: true } },
        attendances: {
          where: { studentId: session.userId },
          select: { status: true, reason: true },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.attendance.findMany({
      where: { studentId: session.userId },
      select: { status: true },
    }),
  ]);

  const presentCount = allAttendance.filter(
    (a) => a.status === ATTENDANCE_STATUS.PRESENT,
  ).length;
  const marked = allAttendance.length;
  const attendanceRate = marked ? Math.round((presentCount / marked) * 100) : null;

  const byDay = new Map<number, typeof lessons>();
  for (const l of lessons) {
    const idx = isoWeekday(l.startAt) - 1;
    const arr = byDay.get(idx) ?? [];
    arr.push(l);
    byDay.set(idx, arr);
  }

  const weekHref = (offset: number) => `/student/calendar?week=${offset}`;

  return (
    <div>
      <PageHeader title={t("myCalendarTitle")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("attendanceRate")}
          value={attendanceRate == null ? "—" : `${attendanceRate}%`}
          hint={marked ? t("ofMarked", { count: marked }) : undefined}
          icon={<TrendingUp />}
          accent={
            attendanceRate == null || attendanceRate >= 80
              ? "success"
              : attendanceRate >= 60
                ? "warning"
                : "danger"
          }
        />
        <div className="sm:col-span-1 lg:col-span-2 flex items-center gap-4 rounded-xl border border-border bg-card px-5 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-success" /> {t("present")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-destructive" /> {t("absent")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-muted-foreground/40" /> {t("upcoming")}
          </span>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {formatDate(weekStart, locale)} – {formatDate(addDays(weekStart, 6), locale)}
        </p>
        <div className="flex items-center rounded-lg border border-border">
          <Link
            href={weekHref(weekOffset - 1)}
            className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
            aria-label={t("prevWeek")}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={weekHref(0)}
            className="border-x border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            {t("today")}
          </Link>
          <Link
            href={weekHref(weekOffset + 1)}
            className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
            aria-label={t("nextWeek")}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        {WEEKDAYS.map((wd, i) => {
          const dayLessons = byDay.get(i) ?? [];
          return (
            <Card key={wd} className="p-4">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="font-semibold">{tw(WEEKDAY_KEYS[wd])}</h2>
                <span className="text-sm text-muted-foreground">
                  {formatDate(addDays(weekStart, i), locale)}
                </span>
              </div>
              {dayLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground/70">{t("noLessonsDay")}</p>
              ) : (
                <div className="space-y-2">
                  {dayLessons.map((l) => {
                    const cancelled = l.status === LESSON_STATUS.CANCELLED;
                    const att = l.attendances[0]?.status ?? null;
                    const tone = cancelled
                      ? "border-border bg-muted/40"
                      : att === ATTENDANCE_STATUS.PRESENT
                        ? "border-success/40 bg-success/5"
                        : att === ATTENDANCE_STATUS.ABSENT
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-border";
                    const dot = cancelled
                      ? "bg-muted-foreground/40"
                      : att === ATTENDANCE_STATUS.PRESENT
                        ? "bg-success"
                        : att === ATTENDANCE_STATUS.ABSENT
                          ? "bg-destructive"
                          : "bg-muted-foreground/40";
                    return (
                      <div
                        key={l.id}
                        className={cn("flex items-start gap-3 rounded-lg border p-3", tone)}
                      >
                        <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dot)} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                "font-medium",
                                cancelled && "text-muted-foreground line-through",
                              )}
                            >
                              {l.title || `${l.group.subject.name} · ${l.group.name}`}
                            </p>
                            {l.type !== LESSON_TYPES.LESSON ? (
                              <Badge variant="warning">{tlt(l.type)}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3.5" />
                              {formatTime(l.startAt, locale)}–{formatTime(l.endAt, locale)}
                            </span>
                            {l.room ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3.5" />
                                {l.room.name}
                              </span>
                            ) : null}
                            {cancelled ? (
                              <span className="font-medium text-destructive">
                                {t("cancelled")}
                              </span>
                            ) : att === ATTENDANCE_STATUS.ABSENT && l.attendances[0]?.reason ? (
                              <span>{l.attendances[0].reason}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
