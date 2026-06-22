"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { gradeCreateSchema, gradeUpdateSchema } from "@/lib/validations";

export type GradeActionState = { error?: string; ok?: boolean };

/** A teacher may grade a student only in a subject they teach to that student's group. */
async function teacherTeaches(teacherId: string, subjectId: string, studentId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { groupId: true },
  });
  if (!student?.groupId) return false;
  const assignment = await prisma.teacherSubject.findFirst({
    where: { teacherId, subjectId, groupId: student.groupId },
  });
  return Boolean(assignment);
}

export async function createGrade(
  _prev: GradeActionState,
  formData: FormData,
): Promise<GradeActionState> {
  const session = await requireRole(ROLES.TEACHER);
  const parsed = gradeCreateSchema.safeParse({
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    value: formData.get("value"),
    maxValue: formData.get("maxValue") || 100,
    type: formData.get("type"),
    comment: formData.get("comment") || null,
    date: formData.get("date") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const d = parsed.data;
  if (!(await teacherTeaches(session.userId, d.subjectId, d.studentId))) {
    return { error: "forbidden" };
  }

  await prisma.grade.create({
    data: {
      studentId: d.studentId,
      subjectId: d.subjectId,
      teacherId: session.userId,
      value: d.value,
      maxValue: d.maxValue,
      type: d.type,
      comment: d.comment ?? null,
      date: d.date ?? new Date(),
    },
  });
  revalidatePath("/teacher/grades");
  return { ok: true };
}

export async function updateGrade(
  _prev: GradeActionState,
  formData: FormData,
): Promise<GradeActionState> {
  const session = await requireRole(ROLES.TEACHER);
  const parsed = gradeUpdateSchema.safeParse({
    id: formData.get("id"),
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    value: formData.get("value"),
    maxValue: formData.get("maxValue") || 100,
    type: formData.get("type"),
    comment: formData.get("comment") || null,
    date: formData.get("date") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const d = parsed.data;
  if (!(await teacherTeaches(session.userId, d.subjectId, d.studentId))) {
    return { error: "forbidden" };
  }

  await prisma.grade.update({
    where: { id: d.id },
    data: {
      value: d.value,
      maxValue: d.maxValue,
      type: d.type,
      comment: d.comment ?? null,
      ...(d.date ? { date: d.date } : {}),
    },
  });
  revalidatePath("/teacher/grades");
  return { ok: true };
}

/** Create or update depending on whether an `id` is present (used by the form). */
export async function saveGrade(
  prev: GradeActionState,
  formData: FormData,
): Promise<GradeActionState> {
  return formData.get("id") ? updateGrade(prev, formData) : createGrade(prev, formData);
}

export async function deleteGrade(id: string) {
  const session = await requireRole(ROLES.TEACHER);
  const grade = await prisma.grade.findUnique({
    where: { id },
    select: { subjectId: true, studentId: true },
  });
  if (!grade) return;
  if (!(await teacherTeaches(session.userId, grade.subjectId, grade.studentId))) {
    return;
  }
  await prisma.grade.delete({ where: { id } });
  revalidatePath("/teacher/grades");
}
