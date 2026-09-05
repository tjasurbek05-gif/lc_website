"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import {
  ATTENDANCE_STATUS,
  EARLY_PAYMENT_DAY,
  LESSON_STATUS,
  ROLES,
  coinLimitFor,
} from "@/lib/constants";
import { canEarnCoins } from "@/lib/finance";
import { lessonEntrySchema, teacherLessonSchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

export type LessonEntryInput = {
  studentId: string;
  status: string;
  reason?: string | null;
  coins: number;
};

/** Local Date for a "YYYY-MM-DD" day, anchored at noon (avoids DST edge cases). */
function dayAtNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Create a teacher-run lesson together with its "typical table": each enrolled
 * student's presence/absence, an optional reason, and the coins awarded (bounded
 * by the lesson type — ±4 typical, ±10 exam). Awarded coins are added to each
 * student's balance. The lesson date must differ from the group's other lessons.
 */
export async function createLesson(
  meta: { groupId: string; title: string; type: string; date: string },
  entries: LessonEntryInput[],
): Promise<ActionState> {
  const session = await requireRole(ROLES.TEACHER);

  const parsedMeta = teacherLessonSchema.safeParse(meta);
  if (!parsedMeta.success) return { error: "invalid" };
  const d = parsedMeta.data;

  // The teacher must own the group; pull the roster (with payment history,
  // to gate coins on paid-up standing) to validate entries.
  const group = await prisma.group.findUnique({
    where: { id: d.groupId },
    select: {
      teacherId: true,
      students: {
        select: {
          id: true,
          coinWaiver: true,
          payments: { orderBy: { dueDate: "desc" } },
        },
      },
    },
  });
  if (!group || group.teacherId !== session.userId) return { error: "forbidden" };

  const now = new Date();
  // Maps each enrolled student to whether they may currently earn coins.
  // Only enrolled students appear here, so a missing key means "not a member".
  const enrolled = new Map(
    group.students.map((s) => [
      s.id,
      canEarnCoins(s.payments, s.coinWaiver, EARLY_PAYMENT_DAY, now),
    ]),
  );
  const limit = coinLimitFor(d.type);

  const clean: {
    studentId: string;
    status: string;
    reason: string | null;
    coins: number;
  }[] = [];
  for (const raw of entries) {
    const parsed = lessonEntrySchema.safeParse(raw);
    if (!parsed.success) return { error: "invalid" };
    const e = parsed.data;
    const paid = enrolled.get(e.studentId);
    if (paid === undefined) continue; // ignore non-members
    if (e.coins < -limit || e.coins > limit) return { error: "coinRange" };
    clean.push({
      studentId: e.studentId,
      status: e.status,
      // Coins only apply to present, paid-up students; absent or unpaid
      // students always get 0.
      coins: e.status === ATTENDANCE_STATUS.ABSENT || !paid ? 0 : e.coins,
      reason: e.status === ATTENDANCE_STATUS.ABSENT ? e.reason : null,
    });
  }

  const startAt = dayAtNoon(d.date);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  // Enforce: no other lesson for this group on the same calendar day.
  const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const clash = await prisma.lesson.findFirst({
    where: { groupId: d.groupId, startAt: { gte: dayStart, lt: dayEnd } },
    select: { id: true },
  });
  if (clash) return { error: "dateTaken" };

  try {
    await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          groupId: d.groupId,
          title: d.title,
          type: d.type,
          startAt,
          endAt,
          status: LESSON_STATUS.SCHEDULED,
        },
      });
      if (clean.length) {
        await tx.attendance.createMany({
          data: clean.map((c) => ({
            lessonId: lesson.id,
            studentId: c.studentId,
            status: c.status,
            reason: c.reason,
            coins: c.coins,
          })),
        });
        // Apply coin awards to student balances.
        for (const c of clean) {
          if (c.coins !== 0) {
            await tx.user.update({
              where: { id: c.studentId },
              data: { coins: { increment: c.coins } },
            });
          }
        }
      }
    });
  } catch {
    return { error: "dateTaken" };
  }

  revalidatePath("/teacher/lessons");
  revalidatePath("/teacher");
  revalidatePath("/admin/reviews");
  revalidatePath("/student");
  return { ok: true };
}
