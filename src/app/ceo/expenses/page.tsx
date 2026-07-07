import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { currentPeriod, expensesForPeriod } from "@/lib/finance";
import { ExpensesManager, type ExpenseRow } from "@/components/ceo/expenses-manager";

export default async function CeoExpensesPage() {
  await requireRole(ROLES.CEO);
  const t = await getTranslations("ceo");
  const locale = await getLocale();

  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });

  const rows: ExpenseRow[] = expenses.map((x) => ({
    id: x.id,
    name: x.name,
    amount: x.amount,
    date: x.date.toISOString(),
  }));

  const totalThisMonth = expensesForPeriod(expenses, currentPeriod());
  const totalAll = expenses.reduce((sum, x) => sum + x.amount, 0);

  return (
    <ExpensesManager
      expenses={rows}
      totalThisMonth={totalThisMonth}
      totalAll={totalAll}
      locale={locale}
      title={t("expensesTitle")}
      hint={t("expensesHint")}
    />
  );
}
