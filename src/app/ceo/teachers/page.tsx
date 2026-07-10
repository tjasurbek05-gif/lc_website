import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { currentPeriod, monthPeriod } from "@/lib/finance";
import {
  TeacherPayouts,
  type PendingShareRow,
  type TeacherRow,
} from "@/components/ceo/teacher-payouts";

function periodLabelFor(period: string, locale: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const intl = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";
  return date.toLocaleDateString(intl, { month: "long", year: "numeric" });
}

export default async function CeoTeachersPage() {
  await requireRole(ROLES.CEO);
  const t = await getTranslations("ceo");
  const locale = await getLocale();
  const period = currentPeriod();

  const teachers = await prisma.user.findMany({
    where: { role: ROLES.TEACHER },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      salary: true,
      payouts: { where: { period } },
      paymentShares: {
        where: { paidAt: { not: null }, teacherShareAmount: { not: null } },
        select: {
          id: true,
          amount: true,
          teacherSharePct: true,
          teacherShareAmount: true,
          teacherShareConfirmedAt: true,
          paidAt: true,
          student: { select: { name: true } },
        },
        orderBy: { paidAt: "asc" },
      },
    },
  });

  const rows: TeacherRow[] = teachers.map((tch) => {
    const confirmedThisMonth = tch.paymentShares.filter(
      (s) => s.teacherShareConfirmedAt && monthPeriod(s.teacherShareConfirmedAt) === period,
    );
    const pending = tch.paymentShares.filter((s) => !s.teacherShareConfirmedAt);
    return {
      id: tch.id,
      name: tch.name,
      phone: tch.phone,
      salary: tch.salary ?? 0,
      paidAt: tch.payouts[0]?.paidAt ? tch.payouts[0].paidAt.toISOString() : null,
      confirmedSharesThisMonth: confirmedThisMonth.reduce(
        (sum, s) => sum + (s.teacherShareAmount ?? 0),
        0,
      ),
      pendingSharesTotal: pending.reduce((sum, s) => sum + (s.teacherShareAmount ?? 0), 0),
    };
  });

  const pendingShares: PendingShareRow[] = teachers
    .flatMap((tch) =>
      tch.paymentShares
        .filter((s) => !s.teacherShareConfirmedAt)
        .map((s) => ({
          id: s.id,
          teacherName: tch.name,
          studentName: s.student.name,
          amount: s.amount,
          sharePct: s.teacherSharePct ?? 0,
          shareAmount: s.teacherShareAmount ?? 0,
          paidAt: s.paidAt!.toISOString(),
        })),
    )
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt));

  return (
    <TeacherPayouts
      teachers={rows}
      pendingShares={pendingShares}
      period={period}
      periodLabel={periodLabelFor(period, locale)}
      locale={locale}
      title={t("teachersTitle")}
      hint={t("teachersHint")}
    />
  );
}
