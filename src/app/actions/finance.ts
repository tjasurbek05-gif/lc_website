"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { addOneMonth } from "@/lib/finance";
import {
  expenseSchema,
  financeInfoSchema,
  recordPaymentSchema,
  teacherPayoutSchema,
  teacherSalarySchema,
  tuitionFeeSchema,
} from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean; paymentId?: string };

/** First receipt number, so early receipts already look like real ones. */
const RECEIPT_BASE = 10_000_000;

function revalidateFinance() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  revalidatePath("/ceo");
  revalidatePath("/ceo/teachers");
  revalidatePath("/ceo/expenses");
  revalidatePath("/student");
}

/* ------------------------------ Settings ------------------------------ */

export async function setTuitionFee(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = tuitionFeeSchema.safeParse({ fee: formData.get("fee") });
  if (!parsed.success) return { error: "invalid" };

  await prisma.financeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", tuitionFee: parsed.data.fee },
    update: { tuitionFee: parsed.data.fee },
  });
  revalidateFinance();
  return { ok: true };
}

/** Company / branch name shown on printed receipts (admin-editable). */
export async function setFinanceInfo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = financeInfoSchema.safeParse({
    companyName: formData.get("companyName"),
    branchName: formData.get("branchName"),
  });
  if (!parsed.success) return { error: "invalid" };
  await prisma.financeSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      companyName: parsed.data.companyName,
      branchName: parsed.data.branchName,
    },
    update: {
      companyName: parsed.data.companyName,
      branchName: parsed.data.branchName,
    },
  });
  revalidateFinance();
  return { ok: true };
}

/* ------------------------------- Tuition ------------------------------- */

/**
 * Record a tuition payment for a student's current open cycle (creating
 * their very first cycle if they have none yet), then immediately open the
 * next monthly cycle — so every student always has exactly one open
 * (pending/overdue) cycle to track.
 */
export async function recordPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(ROLES.ADMIN);
  const parsed = recordPaymentSchema.safeParse({
    studentId: formData.get("studentId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method") || "CASH",
    groupId: formData.get("groupId"),
    teacherId: formData.get("teacherId"),
    teacherSharePct: formData.get("teacherSharePct"),
  });
  if (!parsed.success) return { error: "invalid" };
  const { studentId, amount, paidAt, method } = parsed.data;

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== ROLES.STUDENT) return { error: "invalid" };

  // Resolve the optional group and teacher-share, ignoring invalid references.
  let groupId: string | null = null;
  if (parsed.data.groupId) {
    const group = await prisma.group.findUnique({ where: { id: parsed.data.groupId } });
    groupId = group ? group.id : null;
  }
  let teacherId: string | null = null;
  let teacherSharePct: number | null = null;
  let teacherShareAmount: number | null = null;
  if (parsed.data.teacherId && parsed.data.teacherSharePct != null) {
    const teacher = await prisma.user.findUnique({ where: { id: parsed.data.teacherId } });
    if (teacher && teacher.role === ROLES.TEACHER) {
      teacherId = teacher.id;
      teacherSharePct = parsed.data.teacherSharePct;
      teacherShareAmount = Math.round((amount * teacherSharePct) / 100);
    }
  }

  const paidAtDate = new Date(`${paidAt}T00:00:00`);

  const last = await prisma.payment.findFirst({
    where: { receiptNo: { not: null } },
    orderBy: { receiptNo: "desc" },
    select: { receiptNo: true },
  });
  const receiptNo = (last?.receiptNo ?? RECEIPT_BASE) + 1;

  const paidData = {
    amount,
    paidAt: paidAtDate,
    method,
    receiptNo,
    groupId,
    recordedById: session.userId,
    teacherId,
    teacherSharePct,
    teacherShareAmount,
  };

  const openCycle = await prisma.payment.findFirst({
    where: { studentId, paidAt: null },
    orderBy: { dueDate: "asc" },
  });

  let paymentId: string;
  if (openCycle) {
    const updated = await prisma.payment.update({
      where: { id: openCycle.id },
      data: paidData,
    });
    paymentId = updated.id;
  } else {
    const created = await prisma.payment.create({
      data: { studentId, dueDate: paidAtDate, ...paidData },
    });
    paymentId = created.id;
  }

  await prisma.payment.create({
    data: { studentId, amount, dueDate: addOneMonth(paidAtDate), paidAt: null },
  });

  revalidateFinance();
  return { ok: true, paymentId };
}

/** Full receipt data for a recorded payment (used by the printable receipt). */
export async function getReceiptData(paymentId: string) {
  await requireRole(ROLES.ADMIN);
  const [payment, settings] = await Promise.all([
    prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        student: { select: { name: true, phone: true } },
        group: { select: { name: true, subject: { select: { name: true } }, teacher: { select: { name: true } } } },
        teacher: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    prisma.financeSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!payment) return null;

  return {
    receiptNo: payment.receiptNo,
    companyName: settings?.companyName ?? "Brian",
    branchName: settings?.branchName ?? null,
    studentName: payment.student.name,
    studentPhone: payment.student.phone,
    groupName: payment.group
      ? payment.group.subject
        ? `${payment.group.subject.name} · ${payment.group.name}`
        : payment.group.name
      : null,
    teacherName: payment.teacher?.name ?? payment.group?.teacher?.name ?? null,
    method: payment.method,
    amount: payment.amount,
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    recordedAt: payment.updatedAt.toISOString(),
    recordedByName: payment.recordedBy?.name ?? null,
  };
}

export type ReceiptData = NonNullable<Awaited<ReturnType<typeof getReceiptData>>>;

/** Undo the most recently recorded payment for a student (fixes mistakes). */
export async function undoLastPayment(studentId: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const lastPaid = await prisma.payment.findFirst({
    where: { studentId, paidAt: { not: null } },
    orderBy: { paidAt: "desc" },
  });
  if (!lastPaid) return { error: "invalid" };

  // The next cycle auto-opened right after this payment — drop it (it's
  // still untouched), then reopen the payment we're undoing.
  const nextCycle = await prisma.payment.findFirst({
    where: { studentId, paidAt: null },
    orderBy: { dueDate: "desc" },
  });
  if (nextCycle) await prisma.payment.delete({ where: { id: nextCycle.id } });
  await prisma.payment.update({ where: { id: lastPaid.id }, data: { paidAt: null } });

  revalidateFinance();
  return { ok: true };
}

/* ---------------------------- Teacher payouts --------------------------- */

export async function setTeacherSalary(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.CEO);
  const parsed = teacherSalarySchema.safeParse({
    teacherId: formData.get("teacherId"),
    salary: formData.get("salary"),
  });
  if (!parsed.success) return { error: "invalid" };

  const teacher = await prisma.user.findUnique({ where: { id: parsed.data.teacherId } });
  if (!teacher || teacher.role !== ROLES.TEACHER) return { error: "invalid" };

  await prisma.user.update({
    where: { id: parsed.data.teacherId },
    data: { salary: parsed.data.salary },
  });
  revalidateFinance();
  return { ok: true };
}

/** Toggle a teacher's payout for a given "YYYY-MM" period between paid/unpaid. */
export async function toggleTeacherPayout(
  teacherId: string,
  period: string,
): Promise<ActionState> {
  await requireRole(ROLES.CEO);
  const parsed = teacherPayoutSchema.safeParse({ teacherId, period });
  if (!parsed.success) return { error: "invalid" };

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== ROLES.TEACHER) return { error: "invalid" };

  const existing = await prisma.teacherPayout.findUnique({
    where: { teacherId_period: { teacherId, period } },
  });

  if (existing) {
    await prisma.teacherPayout.update({
      where: { id: existing.id },
      data: { paidAt: existing.paidAt ? null : new Date() },
    });
  } else {
    await prisma.teacherPayout.create({
      data: { teacherId, period, amount: teacher.salary ?? 0, paidAt: new Date() },
    });
  }
  revalidateFinance();
  return { ok: true };
}

/* ------------------------------ Expenses ------------------------------- */

export async function addExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(ROLES.CEO);
  const parsed = expenseSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });
  if (!parsed.success) return { error: "invalid" };

  await prisma.expense.create({
    data: {
      name: parsed.data.name,
      amount: parsed.data.amount,
      date: new Date(`${parsed.data.date}T00:00:00`),
      createdById: session.userId,
    },
  });
  revalidateFinance();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionState> {
  await requireRole(ROLES.CEO);
  await prisma.expense.delete({ where: { id } });
  revalidateFinance();
  return { ok: true };
}
