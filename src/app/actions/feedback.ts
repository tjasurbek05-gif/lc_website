"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { feedbackSchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

/**
 * A student leaves a comment for one of their own teachers. The teacher must
 * actually teach a group the student is enrolled in — this is checked here,
 * not just trusted from the form, so students can't message arbitrary
 * teachers.
 */
export async function sendFeedback(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(ROLES.STUDENT);
  const parsed = feedbackSchema.safeParse({
    teacherId: formData.get("teacherId"),
    groupId: formData.get("groupId"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: "invalid" };

  const enrolledGroups = await prisma.group.findMany({
    where: { students: { some: { id: session.userId } } },
    select: { id: true, teacherId: true },
  });
  const isMyTeacher = enrolledGroups.some((g) => g.teacherId === parsed.data.teacherId);
  if (!isMyTeacher) return { error: "invalid" };

  const matchedGroup = enrolledGroups.find(
    (g) => g.id === parsed.data.groupId && g.teacherId === parsed.data.teacherId,
  );

  await prisma.teacherFeedback.create({
    data: {
      studentId: session.userId,
      teacherId: parsed.data.teacherId,
      groupId: matchedGroup?.id ?? null,
      message: parsed.data.message,
    },
  });

  revalidatePath("/student/feedback");
  revalidatePath("/teacher/feedback");
  return { ok: true };
}
