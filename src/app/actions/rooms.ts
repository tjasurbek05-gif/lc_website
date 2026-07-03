"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { roomAssignmentSchema, roomSchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

function revalidateRooms() {
  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  revalidatePath("/teacher");
}

/** "HH:MM" → minutes since midnight. */
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* ------------------------------- Rooms ------------------------------- */

export async function saveRoom(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = roomSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    name: formData.get("name"),
    capacity: (formData.get("capacity") as string) || null,
  });
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  try {
    if (d.id) {
      await prisma.room.update({
        where: { id: d.id },
        data: { name: d.name, capacity: d.capacity },
      });
    } else {
      await prisma.room.create({ data: { name: d.name, capacity: d.capacity } });
    }
  } catch {
    return { error: "nameTaken" };
  }
  revalidateRooms();
  return { ok: true };
}

export async function deleteRoom(id: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  await prisma.room.delete({ where: { id } });
  revalidateRooms();
  return { ok: true };
}

/* ------------------------- Teacher assignments ------------------------- */

/**
 * Assign a teacher to a room for one or more weekdays at a time range. A slot is
 * rejected if the room is already booked (by any teacher) for an overlapping
 * time on that weekday, or if the same teacher is already booked elsewhere then.
 * One RoomAssignment row is created per selected weekday.
 */
export async function assignRoom(input: {
  roomId: string;
  teacherId: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
}): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = roomAssignmentSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;

  const teacher = await prisma.user.findUnique({
    where: { id: d.teacherId },
    select: { role: true },
  });
  if (!teacher || teacher.role !== ROLES.TEACHER) return { error: "invalid" };

  const start = timeToMin(d.startTime);
  const end = timeToMin(d.endTime);
  const weekdays = [...new Set(d.weekdays)];

  // Existing assignments on the affected weekdays (room busy + teacher busy).
  const existing = await prisma.roomAssignment.findMany({
    where: { weekday: { in: weekdays } },
    select: {
      weekday: true,
      roomId: true,
      teacherId: true,
      startTime: true,
      endTime: true,
    },
  });

  for (const day of weekdays) {
    for (const a of existing) {
      if (a.weekday !== day) continue;
      const overlaps = start < timeToMin(a.endTime) && timeToMin(a.startTime) < end;
      if (!overlaps) continue;
      if (a.roomId === d.roomId) return { error: "roomBusy" };
      if (a.teacherId === d.teacherId) return { error: "teacherBusy" };
    }
  }

  await prisma.roomAssignment.createMany({
    data: weekdays.map((weekday) => ({
      roomId: d.roomId,
      teacherId: d.teacherId,
      weekday,
      startTime: d.startTime,
      endTime: d.endTime,
    })),
  });

  revalidateRooms();
  return { ok: true };
}

export async function deleteAssignment(id: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  await prisma.roomAssignment.delete({ where: { id } });
  revalidateRooms();
  return { ok: true };
}
