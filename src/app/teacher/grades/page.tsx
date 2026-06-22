import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { averagePercent, mean, toPercent } from "@/lib/metrics";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ScoreBadge } from "@/components/score-badge";
import { ClassGradebook } from "@/components/teacher/class-gradebook";

export default async function TeacherGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const session = await requireRole(ROLES.TEACHER);
  const sp = await searchParams;
  const t = await getTranslations("teacher");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();

  const classes = await prisma.teacherSubject.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
  });
  classes.sort((a, b) =>
    `${a.subject.name}${a.group.name}`.localeCompare(`${b.subject.name}${b.group.name}`),
  );

  if (classes.length === 0) {
    return (
      <div>
        <PageHeader title={tNav("grades")} />
        <EmptyState title={t("noClasses")} icon={<ClipboardList />} />
      </div>
    );
  }

  const selected = classes.find((c) => c.id === sp.class) ?? classes[0];

  const students = await prisma.user.findMany({
    where: { role: ROLES.STUDENT, groupId: selected.groupId },
    select: {
      id: true,
      name: true,
      gradesReceived: {
        where: { subjectId: selected.subjectId },
        select: { value: true, maxValue: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const studentRows = students.map((s) => {
    const ps = s.gradesReceived.map((g) => toPercent(g.value, g.maxValue));
    return {
      id: s.id,
      name: s.name,
      average: ps.length ? Math.round(mean(ps) * 10) / 10 : null,
      count: s.gradesReceived.length,
    };
  });

  const allGrades = students.flatMap((s) =>
    s.gradesReceived.map((g) => ({
      value: g.value,
      maxValue: g.maxValue,
      date: new Date(),
      type: "",
      subjectId: "",
    })),
  );
  const classAvg = allGrades.length ? averagePercent(allGrades) : null;

  const recentRaw = await prisma.grade.findMany({
    where: { subjectId: selected.subjectId, student: { groupId: selected.groupId } },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
    take: 15,
  });
  const recent = recentRaw.map((g) => ({
    id: g.id,
    studentId: g.studentId,
    studentName: g.student.name,
    value: g.value,
    maxValue: g.maxValue,
    type: g.type,
    dateLabel: formatDate(g.date, locale),
    dateISO: g.date.toISOString().slice(0, 10),
    comment: g.comment,
  }));

  return (
    <div>
      <PageHeader
        title={tNav("grades")}
        description={`${selected.subject.name} · ${selected.group.name}`}
        action={
          classAvg == null ? undefined : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("classAverage")}</span>
              <ScoreBadge percent={classAvg} />
            </div>
          )
        }
      />

      {/* Class tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {classes.map((c) => {
          const active = c.id === selected.id;
          return (
            <Link
              key={c.id}
              href={`/teacher/grades?class=${c.id}`}
              className={cn(
                "whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {c.subject.name} · {c.group.name}
            </Link>
          );
        })}
      </div>

      <ClassGradebook
        subjectId={selected.subjectId}
        students={studentRows}
        recent={recent}
      />
    </div>
  );
}
