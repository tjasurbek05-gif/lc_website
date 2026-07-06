"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { addOneMonth } from "@/lib/finance";
import {
  recordPaymentSchema,
  teacherPayoutSchema,
  teacherSalarySchema,
  tuitionFeeSchema,
} from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

function revalidateFinance() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  revalidatePath("/ceo");
  revalidatePath("/ceo/teachers");
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
  await requireRole(ROLES.ADMIN);
  const parsed = recordPaymentSchema.safeParse({
    studentId: formData.get("studentId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
  });
  if (!parsed.success) return { error: "invalid" };
  const { studentId, amount, paidAt } = parsed.data;

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== ROLES.STUDENT) return { error: "invalid" };

  const paidAtDate = new Date(`${paidAt}T00:00:00`);

  const openCycle = await prisma.payment.findFirst({
    where: { studentId, paidAt: null },
    orderBy: { dueDate: "asc" },
  });

  if (openCycle) {
    await prisma.payment.update({
      where: { id: openCycle.id },
      data: { amount, paidAt: paidAtDate },
    });
  } else {
    await prisma.payment.create({
      data: { studentId, amount, dueDate: paidAtDate, paidAt: paidAtDate },
    });
  }

  await prisma.payment.create({
    data: { studentId, amount, dueDate: addOneMonth(paidAtDate), paidAt: null },
  });

  revalidateFinance();
  return { ok: true };
}

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
