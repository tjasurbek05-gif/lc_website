import { getLocale, getTranslations } from "next-intl/server";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  averagePercent,
  mean,
  monthlyTrend,
  overallGpa,
  summarizeBySubject,
  toPercent,
} from "@/lib/metrics";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ScoreBadge } from "@/components/score-badge";
import { ProgressChart } from "@/components/charts/progress-chart";
import { PerformanceBars } from "@/components/charts/performance-bars";

export default async function StudentDashboard() {
  const session = await requireRole(ROLES.STUDENT);
  const [me, grades] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { enrolledGroups: { select: { id: true, subjectId: true } } },
    }),
    prisma.grade.findMany({
      where: { studentId: session.userId },
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const t = await getTranslations("student");
  const tc = await getTranslations("common");
  const tg = await getTranslations("gradeTypes");
  const locale = await getLocale();

  const gradeLikes = grades.map((g) => ({
    value: g.value,
    maxValue: g.maxValue,
    date: g.date,
    type: g.type,
    subjectId: g.subjectId,
  }));
  const overall = averagePercent(gradeLikes);
  const gpa = overallGpa(gradeLikes);
  const subjectNames = new Map(grades.map((g) => [g.subject.id, g.subject.name]));
  const subjectSummary = summarizeBySubject(gradeLikes, subjectNames);
  const trend = monthlyTrend(gradeLikes).map((p) => ({
    label: p.label,
    average: p.average,
  }));
  const recent = grades.slice(0, 8);

  // Number of subjects the student is enrolled in (independent of grades).
  const enrolledSubjects = new Set((me?.enrolledGroups ?? []).map((g) => g.subjectId));

  // Rank among the students who share any of this student's classes.
  let rank: number | null = null;
  let groupSize = 0;
  const myGroupIds = (me?.enrolledGroups ?? []).map((g) => g.id);
  if (myGroupIds.length) {
    const groupGrades = await prisma.grade.findMany({
      where: { student: { enrolledGroups: { some: { id: { in: myGroupIds } } } } },
      select: { studentId: true, value: true, maxValue: true },
    });
    const byStudent = new Map<string, number[]>();
    for (const g of groupGrades) {
      const arr = byStudent.get(g.studentId) ?? [];
      arr.push(toPercent(g.value, g.maxValue));
      byStudent.set(g.studentId, arr);
    }
    const ranked = [...byStudent.entries()]
      .map(([id, ps]) => ({ id, avg: mean(ps) }))
      .sort((a, b) => b.avg - a.avg);
    groupSize = ranked.length;
    const idx = ranked.findIndex((r) => r.id === session.userId);
    rank = idx >= 0 ? idx + 1 : null;
  }

  const avgAccent = overall >= 80 ? "success" : overall >= 60 ? "primary" : "warning";

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("welcome", { name: session.name })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("overallAverage")}
          value={`${overall}%`}
          icon={<TrendingUp />}
          accent={avgAccent}
        />
        <StatCard label={t("gpa")} value={gpa.toFixed(2)} icon={<GraduationCap />} />
        <StatCard
          label={t("subjectsCount")}
          value={enrolledSubjects.size || subjectSummary.length}
          icon={<BookOpen />}
        />
        {rank ? (
          <StatCard
            label={t("rank")}
            value={`#${rank}`}
            hint={`/ ${groupSize}`}
            icon={<Trophy />}
            accent="warning"
          />
        ) : (
          <StatCard
            label={t("gradesCount")}
            value={grades.length}
            icon={<ClipboardList />}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("progressTitle")}</CardTitle>
            <CardDescription>{t("progressSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length ? (
              <ProgressChart data={trend} />
            ) : (
              <EmptyState title={t("noGrades")} icon={<TrendingUp />} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("subjectsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectSummary.length ? (
              <PerformanceBars
                data={subjectSummary.map((s) => ({ label: s.name, value: s.average }))}
              />
            ) : (
              <EmptyState title={t("noGrades")} icon={<BookOpen />} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("recentTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recent.length ? (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{tc("subject")}</TH>
                  <TH>{tc("type")}</TH>
                  <TH>{tc("date")}</TH>
                  <TH className="pr-5 text-right">{tc("grade")}</TH>
                </TR>
              </THead>
              <TBody>
                {recent.map((g) => (
                  <TR key={g.id}>
                    <TD className="pl-5 font-medium">{g.subject.name}</TD>
                    <TD>
                      <Badge variant="outline">{tg(g.type)}</Badge>
                    </TD>
                    <TD className="text-muted-foreground">
                      {formatDate(g.date, locale)}
                    </TD>
                    <TD className="pr-5 text-right">
                      <ScoreBadge
                        percent={toPercent(g.value, g.maxValue)}
                        showLetter={false}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="p-5">
              <EmptyState title={t("noGrades")} icon={<ClipboardList />} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
