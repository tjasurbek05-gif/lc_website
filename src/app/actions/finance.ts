"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { EARLY_PAYMENT_DAY, ROLES, VERY_EARLY_PAYMENT_DAY } from "@/lib/constants";
import { addOneMonth, earlyPaymentBonus, paidDayOfMonth } from "@/lib/finance";
import {
  earlyPaymentBonusSchema,
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

/**
 * Two-tier coin amounts automatically granted when a payment is recorded on
 * or before VERY_EARLY_PAYMENT_DAY / EARLY_PAYMENT_DAY of the month (see
 * recordPayment). 0 turns a tier off.
 */
export async function setEarlyPaymentBonus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = earlyPaymentBonusSchema.safeParse({
    veryEarlyBonusCoins: formData.get("veryEarlyBonusCoins"),
    earlyBonusCoins: formData.get("earlyBonusCoins"),
  });
  if (!parsed.success) return { error: "invalid" };

  await prisma.financeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: { ...parsed.data },
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

  const [last, settings] = await Promise.all([
    prisma.payment.findFirst({
      where: { receiptNo: { not: null } },
      orderBy: { receiptNo: "desc" },
      select: { receiptNo: true },
    }),
    prisma.financeSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const receiptNo = (last?.receiptNo ?? RECEIPT_BASE) + 1;

  // Two-tier early-payment incentive: the earlier the payment, the bigger
  // the coin bonus (0 on a tier disables it).
  const bonusCoins = earlyPaymentBonus(
    paidDayOfMonth(paidAtDate),
    VERY_EARLY_PAYMENT_DAY,
    settings?.veryEarlyBonusCoins ?? 0,
    EARLY_PAYMENT_DAY,
    settings?.earlyBonusCoins ?? 0,
  );

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
    bonusCoins,
  };

  const paymentId = await prisma.$transaction(async (tx) => {
    const openCycle = await tx.payment.findFirst({
      where: { studentId, paidAt: null },
      orderBy: { dueDate: "asc" },
    });

    let id: string;
    if (openCycle) {
      const updated = await tx.payment.update({
        where: { id: openCycle.id },
        data: paidData,
      });
      id = updated.id;
    } else {
      const created = await tx.payment.create({
        data: { studentId, dueDate: paidAtDate, ...paidData },
      });
      id = created.id;
    }

    await tx.payment.create({
      data: { studentId, amount, dueDate: addOneMonth(paidAtDate), paidAt: null },
    });

    if (bonusCoins > 0) {
      await tx.user.update({
        where: { id: studentId },
        data: { coins: { increment: bonusCoins } },
      });
    }

    return id;
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

  await prisma.$transaction(async (tx) => {
    // The next cycle auto-opened right after this payment — drop it (it's
    // still untouched), then reopen the payment we're undoing.
    const nextCycle = await tx.payment.findFirst({
      where: { studentId, paidAt: null },
      orderBy: { dueDate: "desc" },
    });
    if (nextCycle) await tx.payment.delete({ where: { id: nextCycle.id } });
    await tx.payment.update({
      where: { id: lastPaid.id },
      data: { paidAt: null, bonusCoins: 0 },
    });

    // Claw back any early-payment bonus this payment had granted, floored
    // at 0 in case the student already spent some of it in the coin shop.
    if (lastPaid.bonusCoins > 0) {
      const student = await tx.user.findUnique({
        where: { id: studentId },
        select: { coins: true },
      });
      await tx.user.update({
        where: { id: studentId },
        data: { coins: Math.max(0, (student?.coins ?? 0) - lastPaid.bonusCoins) },
      });
    }
  });

  revalidateFinance();
  return { ok: true };
}

/* ------------------------------ Coin waiver ----------------------------- */

/**
 * Toggle a student's coin waiver: an admin-granted exemption letting them
 * keep earning coins from teachers even while not paid up (e.g. documented
 * financial hardship). Purely a coin-earning permission — doesn't change
 * their payment status or any finance reporting.
 */
export async function toggleCoinWaiver(studentId: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { role: true, coinWaiver: true },
  });
  if (!student || student.role !== ROLES.STUDENT) return { error: "invalid" };

  await prisma.user.update({
    where: { id: studentId },
    data: { coinWaiver: !student.coinWaiver },
  });
  revalidateFinance();
  revalidatePath("/teacher/lessons");
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

/**
 * Confirm (or un-confirm) a teacher's revenue-share on a payment. Shares are
 * recorded automatically when the payment is made, but only count as a real
 * payout — and only appear as a cost in the P&L — once the CEO confirms them.
 */
export async function toggleShareConfirmation(paymentId: string): Promise<ActionState> {
  await requireRole(ROLES.CEO);
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !payment.teacherId || !payment.teacherShareAmount) {
    return { error: "invalid" };
  }
  await prisma.payment.update({
    where: { id: paymentId },
    data: { teacherShareConfirmedAt: payment.teacherShareConfirmedAt ? null : new Date() },
  });
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
