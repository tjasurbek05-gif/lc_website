import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  currentPeriod,
  monthPeriod,
  revenueForPeriod,
  studentStandingStatus,
} from "@/lib/finance";
import { isSameDay, isoWeekday } from "@/lib/utils";
import { FinanceManager, type CalendarCell, type StudentFinanceRow } from "@/components/admin/finance-manager";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole(ROLES.ADMIN);
  const sp = await searchParams;
  const t = await getTranslations("admin");
  const locale = await getLocale();

  const monthOffset = Number.parseInt(sp.month ?? "0", 10) || 0;
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = isoWeekday(new Date(year, month, 1)) - 1;

  const [settings, students, teachers] = await Promise.all([
    prisma.financeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.user.findMany({
      where: { role: ROLES.STUDENT, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        coins: true,
        payments: { orderBy: { dueDate: "desc" } },
        enrolledGroups: {
          select: {
            id: true,
            name: true,
            subject: { select: { name: true } },
            teacher: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: ROLES.TEACHER },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const fee = settings?.tuitionFee ?? 0;

  const rows: StudentFinanceRow[] = students.map((s) => {
    const open = s.payments.find((p) => !p.paidAt) ?? null;
    const lastPaid = s.payments.find((p) => p.paidAt) ?? null;
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      coins: s.coins,
      status: studentStandingStatus(s.payments, now),
      dueDate: open ? open.dueDate.toISOString() : null,
      dueAmount: open ? open.amount : null,
      lastPaidAt: lastPaid?.paidAt ? lastPaid.paidAt.toISOString() : null,
      lastAmount: lastPaid ? lastPaid.amount : null,
      groups: s.enrolledGroups.map((g) => ({
        id: g.id,
        label: `${g.subject.name} · ${g.name}`,
        teacherId: g.teacher?.id ?? null,
        teacherName: g.teacher?.name ?? null,
      })),
      history: s.payments
        .filter((p) => p.paidAt)
        .map((p) => ({
          id: p.id,
          amount: p.amount,
          paidAt: p.paidAt!.toISOString(),
          bonusCoins: p.bonusCoins,
        }))
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    };
  });

  const allPayments = students.flatMap((s) =>
    s.payments.map((p) => ({ ...p, studentName: s.name })),
  );

  const cells: CalendarCell[] = [];
  for (let d = 1; d <= daysCount; d++) {
    const date = new Date(year, month, d);
    cells.push({
      day: d,
      date: dateInput(date),
      isToday: isSameDay(date, now),
      due: allPayments
        .filter((p) => !p.paidAt && isSameDay(p.dueDate, date))
        .map((p) => ({ id: p.studentId, name: p.studentName, overdue: date.getTime() < now.getTime() && !isSameDay(date, now) })),
      paid: allPayments
        .filter((p) => p.paidAt && isSameDay(p.paidAt, date))
        .map((p) => ({ id: p.studentId, name: p.studentName })),
    });
  }

  const stats = {
    total: rows.length,
    good: rows.filter((r) => r.status === "GOOD").length,
    overdue: rows.filter((r) => r.status === "OVERDUE").length,
    none: rows.filter((r) => r.status === "NONE").length,
    revenueThisView: revenueForPeriod(allPayments, monthPeriod(viewDate)),
    revenueThisMonth: revenueForPeriod(allPayments, currentPeriod(now)),
  };

  const monthLabel = viewDate.toLocaleDateString(
    locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <FinanceManager
      fee={fee}
      earlyBonusCoins={settings?.earlyPaymentBonusCoins ?? 0}
      companyName={settings?.companyName ?? "Brian"}
      branchName={settings?.branchName ?? null}
      teachers={teachers}
      monthOffset={monthOffset}
      monthLabel={monthLabel}
      leadingBlanks={leadingBlanks}
      cells={cells}
      students={rows}
      stats={stats}
      locale={locale}
      title={t("financeTitle")}
      hint={t("financeHint")}
    />
  );
}
