"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import {
  groupSchema,
  subjectSchema,
  teacherAssignmentSchema,
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
    email: formData.get("email"),
    role: formData.get("role"),
    groupId: (formData.get("groupId") as string) || null,
    password: (formData.get("password") as string) || "",
  };

  if (id) {
    const parsed = userUpdateSchema.safeParse({ id, ...raw });
    if (!parsed.success) return { error: "invalid" };
    const d = parsed.data;
    const data: {
      name: string;
      email: string;
      role: string;
      groupId: string | null;
      passwordHash?: string;
    } = {
      name: d.name,
      email: d.email.toLowerCase(),
      role: d.role,
      groupId: d.role === ROLES.STUDENT ? d.groupId || null : null,
    };
    if (d.password) data.passwordHash = await hashPassword(d.password);
    try {
      await prisma.user.update({ where: { id }, data });
    } catch {
      return { error: "emailTaken" };
    }
  } else {
    const parsed = userCreateSchema.safeParse(raw);
    if (!parsed.success) return { error: "invalid" };
    const d = parsed.data;
    try {
      await prisma.user.create({
        data: {
          name: d.name,
          email: d.email.toLowerCase(),
          role: d.role,
          groupId: d.role === ROLES.STUDENT ? d.groupId || null : null,
          passwordHash: await hashPassword(d.password),
        },
      });
    } catch {
      return { error: "emailTaken" };
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
}

/* ----------------------------- Groups ----------------------------- */

export async function saveGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = groupSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: "invalid" };
  try {
    if (parsed.data.id) {
      await prisma.group.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name },
      });
    } else {
      await prisma.group.create({ data: { name: parsed.data.name } });
    }
  } catch {
    return { error: "nameTaken" };
  }
  revalidateAdmin("/admin/groups");
  return { ok: true };
}

export async function deleteGroup(id: string) {
  await requireRole(ROLES.ADMIN);
  await prisma.group.delete({ where: { id } });
  revalidateAdmin("/admin/groups");
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

/* ----------------------------- Assignments ----------------------------- */

export async function createAssignment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = teacherAssignmentSchema.safeParse({
    teacherId: formData.get("teacherId"),
    subjectId: formData.get("subjectId"),
    groupId: formData.get("groupId"),
  });
  if (!parsed.success) return { error: "invalid" };
  try {
    await prisma.teacherSubject.create({ data: parsed.data });
  } catch {
    return { error: "duplicate" };
  }
  revalidateAdmin("/admin/subjects");
  return { ok: true };
}

export async function deleteAssignment(id: string) {
  await requireRole(ROLES.ADMIN);
  await prisma.teacherSubject.delete({ where: { id } });
  revalidateAdmin("/admin/subjects");
}
