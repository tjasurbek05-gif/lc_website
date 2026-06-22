import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, ChevronRight, Layers, TrendingUp, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { averagePercent } from "@/lib/metrics";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ScoreBadge } from "@/components/score-badge";

export default async function TeacherDashboard() {
  const session = await requireRole(ROLES.TEACHER);
  const t = await getTranslations("teacher");

  const classes = await prisma.teacherSubject.findMany({
    where: { teacherId: session.userId },
    include: {
      subject: { select: { id: true, name: true } },
      group: {
        select: { id: true, name: true, _count: { select: { students: true } } },
      },
    },
  });
  classes.sort((a, b) =>
    `${a.subject.name}${a.group.name}`.localeCompare(`${b.subject.name}${b.group.name}`),
  );

  const subjectIds = [...new Set(classes.map((c) => c.subjectId))];
  const groupIds = [...new Set(classes.map((c) => c.groupId))];
  const grades = classes.length
    ? await prisma.grade.findMany({
        where: {
          subjectId: { in: subjectIds },
          student: { groupId: { in: groupIds } },
        },
        select: {
          subjectId: true,
          value: true,
          maxValue: true,
          student: { select: { groupId: true } },
        },
      })
    : [];

  const toLike = (g: { value: number; maxValue: number }) => ({
    value: g.value,
    maxValue: g.maxValue,
    date: new Date(),
    type: "",
    subjectId: "",
  });
  const avgPerformance = grades.length ? averagePercent(grades.map(toLike)) : 0;

  const distinctGroups = new Map<string, number>();
  for (const c of classes) distinctGroups.set(c.groupId, c.group._count.students);
  const totalStudents = [...distinctGroups.values()].reduce((a, b) => a + b, 0);

  function classAverage(subjectId: string, groupId: string) {
    const gs = grades.filter(
      (g) => g.subjectId === subjectId && g.student.groupId === groupId,
    );
    return gs.length ? averagePercent(gs.map(toLike)) : null;
  }

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("welcome", { name: session.name })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("classesCount")} value={classes.length} icon={<Layers />} />
        <StatCard label={t("studentsCount")} value={totalStudents} icon={<Users />} />
        <StatCard
          label={t("subjectsCount")}
          value={subjectIds.length}
          icon={<BookOpen />}
        />
        <StatCard
          label={t("avgPerformance")}
          value={`${avgPerformance}%`}
          icon={<TrendingUp />}
          accent={avgPerformance >= 80 ? "success" : avgPerformance >= 60 ? "primary" : "warning"}
        />
      </div>

      <h2 className="mb-4 mt-8 text-lg font-semibold">{t("myClassesTitle")}</h2>
      {classes.length === 0 ? (
        <EmptyState title={t("noClasses")} icon={<Layers />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const avg = classAverage(c.subjectId, c.groupId);
            return (
              <Link key={c.id} href={`/teacher/grades?class=${c.id}`}>
                <Card className="group h-full transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full flex-col p-5 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{c.subject.name}</p>
                        <p className="text-sm text-muted-foreground">{c.group.name}</p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="size-4" />
                        {c.group._count.students}
                      </span>
                      {avg == null ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <ScoreBadge percent={avg} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
