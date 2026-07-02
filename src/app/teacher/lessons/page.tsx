import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { LessonsManager, type GroupOption } from "@/components/teacher/lessons-manager";
import { type PreviousLessonView } from "@/components/lessons/previous-lesson";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function TeacherLessonsPage() {
  const session = await requireRole(ROLES.TEACHER);
  const locale = await getLocale();

  const [groups, lessons] = await Promise.all([
    prisma.group.findMany({
      where: { teacherId: session.userId },
      orderBy: { name: "asc" },
      include: {
        subject: { select: { name: true } },
        students: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        lessons: { select: { startAt: true } },
      },
    }),
    prisma.lesson.findMany({
      where: { group: { teacherId: session.userId } },
      orderBy: { startAt: "desc" },
      include: {
        group: { select: { name: true, subject: { select: { name: true } } } },
        attendances: { include: { student: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const groupOptions: GroupOption[] = groups.map((g) => ({
    id: g.id,
    label: `${g.subject.name} · ${g.name}`,
    students: g.students,
    takenDates: g.lessons.map((l) => dateKey(l.startAt)),
  }));

  const previous: PreviousLessonView[] = lessons.map((l) => ({
    id: l.id,
    title: l.title ?? `${l.group.subject.name} · ${l.group.name}`,
    type: l.type,
    dateLabel: formatDate(l.startAt, locale),
    groupLabel: `${l.group.subject.name} · ${l.group.name}`,
    entries: l.attendances
      .map((a) => ({
        studentId: a.student.id,
        name: a.student.name,
        status: a.status as "PRESENT" | "ABSENT",
        reason: a.reason,
        coins: a.coins,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return <LessonsManager groups={groupOptions} lessons={previous} />;
}
