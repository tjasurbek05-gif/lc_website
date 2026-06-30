import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toPercent } from "@/lib/metrics";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ScoreBadge } from "@/components/score-badge";

export default async function AdminDashboard() {
  await requireRole(ROLES.ADMIN);
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const tg = await getTranslations("gradeTypes");
  const locale = await getLocale();

  const [students, teachers, groups, subjects, recent] = await Promise.all([
    prisma.user.count({ where: { role: ROLES.STUDENT } }),
    prisma.user.count({ where: { role: ROLES.TEACHER } }),
    prisma.group.count(),
    prisma.subject.count(),
    prisma.grade.findMany({
      include: {
        student: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  const quickActions = [
    {
      href: "/admin/users?new=student",
      label: t("addStudent"),
      icon: <UserPlus />,
      tone: "from-violet-500 to-indigo-500",
    },
    {
      href: "/admin/users?new=teacher",
      label: t("addTeacher"),
      icon: <GraduationCap />,
      tone: "from-cyan-500 to-blue-500",
    },
    {
      href: "/admin/subjects?new=1",
      label: t("addSubject"),
      icon: <Plus />,
      tone: "from-fuchsia-500 to-pink-500",
    },
  ];

  return (
    <div>
      <PageHeader title={t("title")} description={t("gettingStarted")} />

      {/* Quick actions — the few things an admin needs most often. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${a.tone} text-white shadow-sm [&_svg]:size-5`}
              >
                {a.icon}
              </span>
              <span className="font-medium">{a.label}</span>
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalStudents")} value={students} icon={<Users />} />
        <StatCard
          label={t("totalTeachers")}
          value={teachers}
          icon={<GraduationCap />}
          accent="success"
        />
        <StatCard
          label={t("totalGroups")}
          value={groups}
          icon={<Layers />}
          accent="warning"
        />
        <StatCard label={t("totalSubjects")} value={subjects} icon={<BookOpen />} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("recentGrades")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recent.length ? (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{tc("student")}</TH>
                  <TH>{tc("subject")}</TH>
                  <TH>{tc("type")}</TH>
                  <TH>{tc("date")}</TH>
                  <TH className="pr-5 text-right">{tc("grade")}</TH>
                </TR>
              </THead>
              <TBody>
                {recent.map((g) => (
                  <TR key={g.id}>
                    <TD className="pl-5 font-medium">{g.student.name}</TD>
                    <TD className="text-muted-foreground">{g.subject.name}</TD>
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
              <EmptyState title={tc("noData")} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
