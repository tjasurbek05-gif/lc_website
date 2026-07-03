"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import {
  enrollmentSchema,
  groupSchema,
  normalizePhone,
  subjectSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

function revalidateAdmin(path: string) {
  revalidatePath(path);
  revalidatePath("/admin");
}

/* ----------------------------- Users ----------------------------- */

export async function saveUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const id = (formData.get("id") as string) || "";
  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    password: (formData.get("password") as string) || "",
  };

  if (id) {
    const parsed = userUpdateSchema.safeParse({ id, ...raw });
    if (!parsed.success) return { error: "invalid" };
    const d = parsed.data;
    const data: {
      name: string;
      phone: string;
      role: string;
      passwordHash?: string;
    } = {
      name: d.name,
      phone: normalizePhone(d.phone),
      role: d.role,
    };
    if (d.password) data.passwordHash = await hashPassword(d.password);
    try {
      await prisma.user.update({ where: { id }, data });
    } catch {
      return { error: "phoneTaken" };
    }
  } else {
    const parsed = userCreateSchema.safeParse(raw);
    if (!parsed.success) return { error: "invalid" };
    const d = parsed.data;
    try {
      await prisma.user.create({
        data: {
          name: d.name,
          phone: normalizePhone(d.phone),
          role: d.role,
          passwordHash: await hashPassword(d.password),
        },
      });
    } catch {
      return { error: "phoneTaken" };
    }
  }

  revalidateAdmin("/admin/users");
  return { ok: true };
}

export async function deleteUser(id: string) {
  const session = await requireRole(ROLES.ADMIN);
  if (id === session.userId) return; // never delete yourself
  await prisma.user.delete({ where: { id } });
  revalidateAdmin("/admin/users");
  revalidatePath("/admin/subjects");
}

/* ----------------------------- Subjects ----------------------------- */

export async function saveSubject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = subjectSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    name: formData.get("name"),
    description: (formData.get("description") as string) || null,
  });
  if (!parsed.success) return { error: "invalid" };
  try {
    if (parsed.data.id) {
      await prisma.subject.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name, description: parsed.data.description ?? null },
      });
    } else {
      await prisma.subject.create({
        data: { name: parsed.data.name, description: parsed.data.description ?? null },
      });
    }
  } catch {
    return { error: "nameTaken" };
  }
  revalidateAdmin("/admin/subjects");
  return { ok: true };
}

export async function deleteSubject(id: string) {
  await requireRole(ROLES.ADMIN);
  await prisma.subject.delete({ where: { id } });
  revalidateAdmin("/admin/subjects");
}

/* ------------------------- Groups (classes) ------------------------- */

export async function saveGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = groupSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    name: formData.get("name"),
    subjectId: formData.get("subjectId"),
    teacherId: (formData.get("teacherId") as string) || null,
  });
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;

  // Guard: a teacher must reference an actual TEACHER account.
  if (d.teacherId) {
    const teacher = await prisma.user.findUnique({ where: { id: d.teacherId } });
    if (!teacher || teacher.role !== ROLES.TEACHER) return { error: "invalid" };
  }

  try {
    if (d.id) {
      await prisma.group.update({
        where: { id: d.id },
        data: { name: d.name, subjectId: d.subjectId, teacherId: d.teacherId },
      });
    } else {
      await prisma.group.create({
        data: { name: d.name, subjectId: d.subjectId, teacherId: d.teacherId },
      });
    }
  } catch {
    return { error: "nameTaken" };
  }
  revalidateAdmin("/admin/subjects");
  return { ok: true };
}

export async function deleteGroup(id: string) {
  await requireRole(ROLES.ADMIN);
  await prisma.group.delete({ where: { id } });
  revalidateAdmin("/admin/subjects");
}

/* --------------------------- Enrollment ---------------------------- */

/**
 * Enroll a student into a class (group). A student may study any number of
 * subjects (2+), so there is no subject cap.
 */
export async function enrollStudent(
  groupId: string,
  studentId: string,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = enrollmentSchema.safeParse({ groupId, studentId });
  if (!parsed.success) return { error: "invalid" };

  const [group, student] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { subjectId: true } }),
    prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true },
    }),
  ]);
  if (!group || !student || student.role !== ROLES.STUDENT) return { error: "invalid" };

  await prisma.group.update({
    where: { id: groupId },
    data: { students: { connect: { id: studentId } } },
  });
  revalidateAdmin("/admin/subjects");
  return { ok: true };
}

export async function unenrollStudent(
  groupId: string,
  studentId: string,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = enrollmentSchema.safeParse({ groupId, studentId });
  if (!parsed.success) return { error: "invalid" };
  await prisma.group.update({
    where: { id: groupId },
    data: { students: { disconnect: { id: studentId } } },
  });
  revalidateAdmin("/admin/subjects");
  return { ok: true };
}
