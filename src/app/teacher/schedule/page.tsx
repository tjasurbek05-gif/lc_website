import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ATTENDANCE_STATUS, LESSON_STATUS, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { addDays, formatDate, isoWeekday, startOfWeek } from "@/lib/utils";
import { TeacherCalendar, type CalLesson } from "@/components/teacher/teacher-calendar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeInput(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function TeacherSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireRole(ROLES.TEACHER);
  const sp = await searchParams;
  const locale = await getLocale();

  const weekOffset = Number.parseInt(sp.week ?? "0", 10) || 0;
  const now = new Date();
  const weekStart = addDays(startOfWeek(now), weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);

  const [lessons, groups, rooms] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        group: { teacherId: session.userId },
        startAt: { gte: weekStart, lt: weekEnd },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            subject: { select: { name: true } },
            students: { select: { id: true, name: true }, orderBy: { name: "asc" } },
          },
        },
        room: { select: { id: true, name: true } },
        attendances: { select: { studentId: true, status: true, reason: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.group.findMany({
      where: { teacherId: session.userId },
      select: { id: true, name: true, subject: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.room.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const calLessons: CalLesson[] = lessons.map((l) => {
    const byStudent = new Map(l.attendances.map((a) => [a.studentId, a]));
    const present = l.attendances.filter(
      (a) => a.status === ATTENDANCE_STATUS.PRESENT,
    ).length;
    const absent = l.attendances.filter(
      (a) => a.status === ATTENDANCE_STATUS.ABSENT,
    ).length;
    return {
      id: l.id,
      groupId: l.group.id,
      groupLabel: `${l.group.subject.name} · ${l.group.name}`,
      title: l.title,
      type: l.type,
      status: l.status,
      dayIndex: isoWeekday(l.startAt) - 1,
      dateInput: dateInput(l.startAt),
      startInput: timeInput(l.startAt),
      endInput: timeInput(l.endAt),
      roomId: l.roomId,
      roomName: l.room?.name ?? null,
      isPast: l.endAt.getTime() < now.getTime(),
      marked: l.attendances.length > 0,
      total: l.group.students.length,
      present,
      absent,
      students: l.group.students.map((s) => {
        const a = byStudent.get(s.id);
        return {
          id: s.id,
          name: s.name,
          status: (a?.status ?? null) as "PRESENT" | "ABSENT" | null,
          reason: a?.reason ?? null,
        };
      }),
    };
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => ({
    dateLabel: formatDate(addDays(weekStart, i), locale),
  }));

  const groupOptions = groups.map((g) => ({
    id: g.id,
    label: `${g.subject.name} · ${g.name}`,
  }));

  return (
    <TeacherCalendar
      weekOffset={weekOffset}
      weekLabel={`${formatDate(weekStart, locale)} – ${formatDate(addDays(weekStart, 6), locale)}`}
      weekDays={weekDays}
      lessons={calLessons}
      groups={groupOptions}
      rooms={rooms}
      lessonStatusCancelled={LESSON_STATUS.CANCELLED}
    />
  );
}
