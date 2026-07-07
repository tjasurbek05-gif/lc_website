import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { currentPeriod, monthPeriod } from "@/lib/finance";
import { TeacherPayouts, type TeacherRow } from "@/components/ceo/teacher-payouts";

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
        select: { teacherShareAmount: true, paidAt: true },
      },
    },
  });

  const rows: TeacherRow[] = teachers.map((tch) => ({
    id: tch.id,
    name: tch.name,
    phone: tch.phone,
    salary: tch.salary ?? 0,
    paidAt: tch.payouts[0]?.paidAt ? tch.payouts[0].paidAt.toISOString() : null,
    sharesThisMonth: tch.paymentShares
      .filter((s) => s.paidAt && monthPeriod(s.paidAt) === period)
      .reduce((sum, s) => sum + (s.teacherShareAmount ?? 0), 0),
  }));

  return (
    <TeacherPayouts
      teachers={rows}
      period={period}
      periodLabel={periodLabelFor(period, locale)}
      locale={locale}
      title={t("teachersTitle")}
      hint={t("teachersHint")}
    />
  );
}
