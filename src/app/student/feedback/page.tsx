import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  StudentFeedbackForm,
  type SentFeedback,
  type TeacherOption,
} from "@/components/student/feedback-form";

export default async function StudentFeedbackPage() {
  const session = await requireRole(ROLES.STUDENT);
  const t = await getTranslations("feedback");
  const locale = await getLocale();

  const [groups, sent] = await Promise.all([
    prisma.group.findMany({
      where: { students: { some: { id: session.userId } } },
      select: {
        id: true,
        name: true,
        subject: { select: { name: true } },
        teacher: { select: { id: true, name: true } },
      },
    }),
    prisma.teacherFeedback.findMany({
      where: { studentId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { select: { name: true } },
        group: { select: { name: true, subject: { select: { name: true } } } },
      },
    }),
  ]);

  const teacherOptions: TeacherOption[] = groups
    .filter((g) => g.teacher)
    .map((g) => ({
      teacherId: g.teacher!.id,
      teacherName: g.teacher!.name,
      groupId: g.id,
      groupLabel: `${g.subject.name} · ${g.name}`,
    }));

  const history: SentFeedback[] = sent.map((f) => ({
    id: f.id,
    teacherName: f.teacher.name,
    groupLabel: f.group ? `${f.group.subject.name} · ${f.group.name}` : null,
    message: f.message,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <StudentFeedbackForm
      teacherOptions={teacherOptions}
      history={history}
      locale={locale}
      title={t("studentTitle")}
      hint={t("studentHint")}
    />
  );
}
