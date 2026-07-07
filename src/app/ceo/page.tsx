import { getLocale, getTranslations } from "next-intl/server";
import {
  Banknote,
  Download,
  GraduationCap,
  PiggyBank,
  TrendingDown,
  TrendingUp,
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
  payrollForPeriod,
  revenueForPeriod,
  sharesForPeriod,
  studentStandingStatus,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
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

  const [students, teachers, payouts, expenses] = await Promise.all([
    prisma.user.findMany({
      where: { role: ROLES.STUDENT },
      select: { id: true, payments: { orderBy: { dueDate: "desc" } } },
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

  const allPayments = students.flatMap((s) => s.payments);
  const good = students.filter(
    (s) => studentStandingStatus(s.payments, now) === "GOOD",
  ).length;
  const overdue = students.filter(
    (s) => studentStandingStatus(s.payments, now) === "OVERDUE",
  ).length;
  const none = students.length - good - overdue;

  const revenueThisMonth = revenueForPeriod(allPayments, period);
  const salariesThisMonth = payrollForPeriod(payouts, period);
  const sharesThisMonth = sharesForPeriod(allPayments, period);
  const expensesThisMonth = expensesForPeriod(expenses, period);
  const costThisMonth = salariesThisMonth + sharesThisMonth + expensesThisMonth;
  const netProfit = revenueThisMonth - costThisMonth;

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
        action={
          <a href="/ceo/export" className={buttonVariants({ variant: "outline" })}>
            <Download />
            {t("downloadExcel")}
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t("totalStudents")} value={students.length} icon={<Users />} />
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
            {students.length ? (
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
