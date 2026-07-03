import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  PreviousLessonContainer,
  type PreviousLessonView,
} from "@/components/lessons/previous-lesson";

export default async function AdminReviewsPage() {
  await requireRole(ROLES.ADMIN);
  const t = await getTranslations("reviews");
  const locale = await getLocale();

  const teachers = await prisma.user.findMany({
    where: { role: ROLES.TEACHER },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // The most recent lesson for each teacher, with its recorded typical table.
  const latest = await Promise.all(
    teachers.map((teacher) =>
      prisma.lesson.findFirst({
        where: { group: { teacherId: teacher.id } },
        orderBy: { startAt: "desc" },
        include: {
          group: { select: { name: true, subject: { select: { name: true } } } },
          attendances: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
      }),
    ),
  );

  const reviews: { teacherName: string; lesson: PreviousLessonView }[] = [];
  teachers.forEach((teacher, i) => {
    const l = latest[i];
    if (!l) return;
    const entries = l.attendances
      .map((a) => ({
        studentId: a.student.id,
        name: a.student.name,
        status: a.status as "PRESENT" | "ABSENT",
        reason: a.reason,
        coins: a.coins,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    reviews.push({
      teacherName: teacher.name,
      lesson: {
        id: l.id,
        title: l.title ?? `${l.group.subject.name} · ${l.group.name}`,
        type: l.type,
        dateLabel: formatDate(l.startAt, locale),
        groupLabel: `${l.group.subject.name} · ${l.group.name}`,
        teacherName: teacher.name,
        entries,
      },
    });
  });

  return (
    <div>
      <PageHeader title={t("title")} description={t("hint")} />
      {reviews.length === 0 ? (
        <EmptyState title={t("empty")} icon={<ClipboardCheck />} />
      ) : (
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.lesson.id}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                {r.teacherName}
              </h2>
              <PreviousLessonContainer lesson={r.lesson} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
