import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { SubjectsHub } from "@/components/admin/subjects-hub";

export default async function AdminSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireRole(ROLES.ADMIN);
  const sp = await searchParams;

  const [subjects, teachers, students, rooms] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        groups: {
          orderBy: { name: "asc" },
          include: {
            teacher: { select: { id: true, name: true } },
            students: { select: { id: true, name: true }, orderBy: { name: "asc" } },
            schedules: {
              orderBy: [{ pattern: "asc" }, { startTime: "asc" }],
              include: { room: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: ROLES.TEACHER },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { role: ROLES.STUDENT },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        enrolledGroups: { select: { subjectId: true } },
      },
    }),
    prisma.room.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const subjectData = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    groups: s.groups.map((g) => ({
      id: g.id,
      name: g.name,
      teacher: g.teacher,
      students: g.students,
      schedules: g.schedules.map((sc) => ({
        id: sc.id,
        pattern: sc.pattern,
        startTime: sc.startTime,
        durationMin: sc.durationMin,
        room: sc.room,
      })),
    })),
  }));

  // Each student carries the distinct set of subjects they're already in, so the
  // enrollment UI can enforce the "at most 2 subjects" rule.
  const studentData = students.map((s) => ({
    id: s.id,
    name: s.name,
    subjectIds: [...new Set(s.enrolledGroups.map((g) => g.subjectId))],
  }));

  return (
    <SubjectsHub
      subjects={subjectData}
      teachers={teachers}
      students={studentData}
      rooms={rooms}
      initialNew={Boolean(sp.new)}
    />
  );
}
