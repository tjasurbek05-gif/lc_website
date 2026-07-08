import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { monthlyProfit, periodLabel } from "@/lib/finance";

// This always reads live data — never cache the route or its response.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const MONEY_FMT = "#,##0";
const DATE_FMT = "dd.mm.yyyy";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== ROLES.CEO) {
    return new Response("Forbidden", { status: 403 });
  }

  const [settings, payments, payouts, expenses] = await Promise.all([
    prisma.financeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.payment.findMany({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "asc" },
      include: {
        student: { select: { name: true } },
        group: { select: { name: true, subject: { select: { name: true } } } },
        teacher: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    prisma.teacherPayout.findMany({
      orderBy: [{ period: "asc" }],
      include: { teacher: { select: { name: true } } },
    }),
    prisma.expense.findMany({ orderBy: { date: "asc" } }),
  ]);

  const company = settings?.companyName ?? "Brian";
  const wb = new ExcelJS.Workbook();
  wb.creator = company;
  wb.created = new Date();

  // --- Sheet 1: monthly P&L summary ---
  const summary = wb.addWorksheet("P&L Summary");
  summary.columns = [
    { header: "Month", key: "month", width: 16 },
    { header: "Revenue", key: "revenue", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Salaries", key: "salaries", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Teacher shares", key: "shares", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Other expenses", key: "expenses", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Total cost", key: "cost", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Net profit", key: "profit", width: 16, style: { numFmt: MONEY_FMT } },
  ];
  const profitRows = monthlyProfit(payments, payouts, expenses);
  for (const p of profitRows) {
    summary.addRow({
      month: periodLabel(p.key),
      revenue: p.revenue,
      salaries: p.salaries,
      shares: p.shares,
      expenses: p.expenses,
      cost: p.cost,
      profit: p.profit,
    });
  }
  const totalRow = summary.addRow({
    month: "TOTAL",
    revenue: profitRows.reduce((s, p) => s + p.revenue, 0),
    salaries: profitRows.reduce((s, p) => s + p.salaries, 0),
    shares: profitRows.reduce((s, p) => s + p.shares, 0),
    expenses: profitRows.reduce((s, p) => s + p.expenses, 0),
    cost: profitRows.reduce((s, p) => s + p.cost, 0),
    profit: profitRows.reduce((s, p) => s + p.profit, 0),
  });
  totalRow.font = { bold: true };
  summary.getRow(1).font = { bold: true };

  // --- Sheet 2: payments ---
  const paySheet = wb.addWorksheet("Payments");
  paySheet.columns = [
    { header: "Receipt", key: "receipt", width: 12 },
    { header: "Date", key: "date", width: 14, style: { numFmt: DATE_FMT } },
    { header: "Student", key: "student", width: 24 },
    { header: "Group", key: "group", width: 24 },
    { header: "Method", key: "method", width: 12 },
    { header: "Amount", key: "amount", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Teacher", key: "teacher", width: 20 },
    { header: "Share %", key: "pct", width: 10 },
    { header: "Teacher share", key: "share", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Recorded by", key: "recordedBy", width: 20 },
  ];
  paySheet.getRow(1).font = { bold: true };
  for (const p of payments) {
    paySheet.addRow({
      receipt: p.receiptNo ?? "",
      date: p.paidAt,
      student: p.student.name,
      group: p.group ? `${p.group.subject.name} · ${p.group.name}` : "",
      method: p.method,
      amount: p.amount,
      teacher: p.teacher?.name ?? "",
      pct: p.teacherSharePct ?? "",
      share: p.teacherShareAmount ?? "",
      recordedBy: p.recordedBy?.name ?? "",
    });
  }

  // --- Sheet 3: teacher payouts (salaries) ---
  const payoutSheet = wb.addWorksheet("Teacher payouts");
  payoutSheet.columns = [
    { header: "Teacher", key: "teacher", width: 24 },
    { header: "Period", key: "period", width: 14 },
    { header: "Amount", key: "amount", width: 16, style: { numFmt: MONEY_FMT } },
    { header: "Status", key: "status", width: 12 },
    { header: "Paid at", key: "paidAt", width: 14, style: { numFmt: DATE_FMT } },
  ];
  payoutSheet.getRow(1).font = { bold: true };
  for (const p of payouts) {
    payoutSheet.addRow({
      teacher: p.teacher.name,
      period: periodLabel(p.period),
      amount: p.amount,
      status: p.paidAt ? "PAID" : "PENDING",
      paidAt: p.paidAt ?? "",
    });
  }

  // --- Sheet 4: expenses ---
  const expSheet = wb.addWorksheet("Expenses");
  expSheet.columns = [
    { header: "Date", key: "date", width: 14, style: { numFmt: DATE_FMT } },
    { header: "Name", key: "name", width: 32 },
    { header: "Amount", key: "amount", width: 16, style: { numFmt: MONEY_FMT } },
  ];
  expSheet.getRow(1).font = { bold: true };
  for (const x of expenses) {
    expSheet.addRow({ date: x.date, name: x.name, amount: x.amount });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${company.replace(/[^\w.-]+/g, "_")}-finance-${stamp}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
