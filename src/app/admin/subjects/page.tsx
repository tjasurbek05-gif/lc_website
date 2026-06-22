import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { SubjectsManager } from "@/components/admin/subjects-manager";
import { AssignmentsManager } from "@/components/admin/assignments-manager";

export default async function AdminSubjectsPage() {
  await requireRole(ROLES.ADMIN);
  const [subjects, assignments, teachers, groups] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.teacherSubject.findMany({
      include: {
        teacher: { select: { name: true } },
        subject: { select: { name: true } },
        group: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: ROLES.TEACHER },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const subjectRows = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  const assignmentRows = assignments
    .map((a) => ({
      id: a.id,
      teacherName: a.teacher.name,
      subjectName: a.subject.name,
      groupName: a.group.name,
    }))
    .sort((x, y) => x.teacherName.localeCompare(y.teacherName));

  return (
    <div className="space-y-8">
      <SubjectsManager subjects={subjectRows} />
      <AssignmentsManager
        assignments={assignmentRows}
        teachers={teachers}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        groups={groups}
      />
    </div>
  );
}
