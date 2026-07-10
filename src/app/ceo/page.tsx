import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  GraduationCap,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  currentPeriod,
  expensesForPeriod,
  monthlyProfit,
  monthlyRevenue,
  monthPeriod,
  payrollForPeriod,
  pendingSharesTotal,
  revenueForPeriod,
  sharesForPeriod,
  studentStandingStatus,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import { ExportButton } from "@/components/ceo/export-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPie } from "@/components/charts/status-pie";
import { RevenueTrend } from "@/components/charts/revenue-trend";
import { ProfitChart } from "@/components/charts/profit-chart";

export default async function CeoDashboard() {
  const session = await requireRole(ROLES.CEO);
  const t = await getTranslations("ceo");
  const locale = await getLocale();
  const now = new Date();
  const period = currentPeriod(now);

  const [allStudents, teachers, payouts, expenses] = await Promise.all([
    prisma.user.findMany({
      where: { role: ROLES.STUDENT },
      select: {
        id: true,
        active: true,
        createdAt: true,
        leftAt: true,
        payments: { orderBy: { dueDate: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: ROLES.TEACHER },
      select: { id: true, salary: true, payouts: { where: { period } } },
    }),
    prisma.teacherPayout.findMany({
      select: { amount: true, period: true, paidAt: true },
    }),
    prisma.expense.findMany({ select: { amount: true, date: true } }),
  ]);

  // Revenue history includes payments from students who have since left — that
  // money was really collected. Standing (good/overdue/not-started) only makes
  // sense for currently active students.
  const allPayments = allStudents.flatMap((s) => s.payments);
  const activeStudents = allStudents.filter((s) => s.active);
  const good = activeStudents.filter(
    (s) => studentStandingStatus(s.payments, now) === "GOOD",
  ).length;
  const overdue = activeStudents.filter(
    (s) => studentStandingStatus(s.payments, now) === "OVERDUE",
  ).length;
  const none = activeStudents.length - good - overdue;
  const newThisMonth = allStudents.filter(
    (s) => monthPeriod(s.createdAt) === period,
  ).length;
  const leftThisMonth = allStudents.filter(
    (s) => s.leftAt && monthPeriod(s.leftAt) === period,
  ).length;

  const revenueThisMonth = revenueForPeriod(allPayments, period);
  const salariesThisMonth = payrollForPeriod(payouts, period);
  const sharesThisMonth = sharesForPeriod(allPayments, period);
  const expensesThisMonth = expensesForPeriod(expenses, period);
  const costThisMonth = salariesThisMonth + sharesThisMonth + expensesThisMonth;
  const netProfit = revenueThisMonth - costThisMonth;
  const pendingShares = pendingSharesTotal(allPayments);

  const trend = monthlyRevenue(allPayments).slice(-6);
  const profitData = monthlyProfit(allPayments, payouts, expenses).slice(-6);

  const pieData = [
    { key: "good", label: t("studentsPaid"), value: good, color: "var(--color-success)" },
    {
      key: "overdue",
      label: t("studentsOverdue"),
      value: overdue,
      color: "var(--color-destructive)",
    },
    { key: "none", label: t("notStarted"), value: none, color: "var(--color-muted-foreground)" },
  ];

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("welcome", { name: session.name })}
        action={<ExportButton label={t("downloadExcel")} downloadingLabel={t("downloading")} />}
      />

      {pendingShares > 0 ? (
        <Link
          href="/ceo/teachers"
          className="mb-6 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 transition-colors hover:bg-warning/15"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning">
            <AlertCircle className="size-5" />
          </span>
          <p className="text-sm font-medium">
            {t("pendingSharesBanner", { amount: formatCurrency(pendingShares, locale) })}
          </p>
          <ArrowRight className="ml-auto size-4 text-muted-foreground" />
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalStudents")} value={activeStudents.length} icon={<Users />} />
        <StatCard
          label={t("newStudentsThisMonth")}
          value={newThisMonth}
          icon={<UserPlus />}
          accent="success"
        />
        <StatCard
          label={t("leftStudentsThisMonth")}
          value={leftThisMonth}
          icon={<UserMinus />}
          accent={leftThisMonth > 0 ? "danger" : "primary"}
        />
        <StatCard label={t("totalTeachers")} value={teachers.length} icon={<GraduationCap />} />
        <StatCard
          label={t("revenueThisMonth")}
          value={formatCurrency(revenueThisMonth, locale)}
          icon={<Banknote />}
          accent="success"
        />
        <StatCard
          label={t("costsThisMonth")}
          value={formatCurrency(costThisMonth, locale)}
          icon={<TrendingDown />}
          accent="warning"
        />
        <StatCard
          label={t("netProfitThisMonth")}
          value={formatCurrency(netProfit, locale)}
          icon={<PiggyBank />}
          accent={netProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("profitTitle")}</CardTitle>
          <CardDescription>{t("profitHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {profitData.length ? (
            <ProfitChart
              data={profitData}
              locale={locale}
              labels={{
                revenue: t("revenueLegend"),
                cost: t("costLegend"),
                profit: t("profitLegend"),
              }}
            />
          ) : (
            <EmptyState title={t("noRevenue")} icon={<TrendingUp />} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("revenueTrend")}</CardTitle>
            <CardDescription>{t("revenueTrendHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length ? (
              <RevenueTrend data={trend} locale={locale} />
            ) : (
              <EmptyState title={t("noRevenue")} icon={<TrendingUp />} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("paymentBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeStudents.length ? (
              <StatusPie data={pieData} />
            ) : (
              <EmptyState title={t("noStudentsYet")} icon={<Users />} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
