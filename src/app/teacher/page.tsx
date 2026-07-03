import { getTranslations } from "next-intl/server";
import { Clock, DoorOpen, Layers, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES, WEEKDAY_KEYS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";

/** "HH:MM" → minutes since midnight. */
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default async function TeacherHome() {
  const session = await requireRole(ROLES.TEACHER);
  const t = await getTranslations("teacher");
  const tw = await getTranslations("weekdays");

  const [classes, assignments] = await Promise.all([
    prisma.group.findMany({
      where: { teacherId: session.userId },
      select: { id: true, students: { select: { id: true } } },
    }),
    prisma.roomAssignment.findMany({
      where: { teacherId: session.userId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      include: { room: { select: { name: true } } },
    }),
  ]);

  const totalStudents = new Set(classes.flatMap((c) => c.students.map((s) => s.id))).size;

  // Weekly class hours = sum of assigned slot durations.
  const totalMinutes = assignments.reduce(
    (acc, a) => acc + Math.max(0, timeToMin(a.endTime) - timeToMin(a.startTime)),
    0,
  );
  const classHours = Math.round((totalMinutes / 60) * 10) / 10;

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("welcome", { name: session.name })}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("classesCount")} value={classes.length} icon={<Layers />} />
        <StatCard label={t("studentsCount")} value={totalStudents} icon={<Users />} />
        <StatCard
          label={t("classHours")}
          value={classHours}
          hint={t("perWeek")}
          icon={<Clock />}
          accent="success"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("myHours")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState title={t("noHours")} icon={<Clock />} />
          ) : (
            <ul className="space-y-2">
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm"
                >
                  <span className="w-12 font-semibold">
                    {tw(WEEKDAY_KEYS[a.weekday])}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-4" />
                    {a.startTime}–{a.endTime}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
                    <DoorOpen className="size-4" />
                    {a.room.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
