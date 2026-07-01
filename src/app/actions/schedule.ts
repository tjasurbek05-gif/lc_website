"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, getSession } from "@/lib/auth";
import {
  ATTENDANCE_STATUS,
  LESSON_STATUS,
  PATTERN_WEEKDAYS,
  ROLES,
} from "@/lib/constants";
import { addDays, startOfWeek } from "@/lib/utils";
import {
  attendanceItemSchema,
  lessonSchema,
  roomSchema,
  scheduleSchema,
} from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

/** How many weeks ahead lessons are generated from a class timetable. */
const GENERATE_WEEKS = 8;

function revalidateSchedule() {
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/subjects");
  revalidatePath("/admin");
  revalidatePath("/teacher/schedule");
  revalidatePath("/student/calendar");
}

/** "HH:MM" → minutes since midnight. */
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Build a local Date from a "YYYY-MM-DD" date and "HH:MM" time. */
function combine(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
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
  revalidateSchedule();
  return { ok: true };
}

export async function deleteRoom(id: string) {
  await requireRole(ROLES.ADMIN);
  await prisma.room.delete({ where: { id } });
  revalidateSchedule();
}

/* --------------------------- Class timetable --------------------------- */

/**
 * Create/update a weekly timetable entry for a class, rejecting clashes where
 * the same teacher or room is already booked on that weekday at an overlapping
 * time. On success, upcoming lessons are (re)generated from the timetable.
 */
export async function saveSchedule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = scheduleSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    groupId: formData.get("groupId"),
    pattern: formData.get("pattern"),
    startTime: formData.get("startTime"),
    durationMin: formData.get("durationMin") || 90,
    roomId: (formData.get("roomId") as string) || null,
  });
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;

  const group = await prisma.group.findUnique({
    where: { id: d.groupId },
    select: { teacherId: true },
  });
  if (!group) return { error: "invalid" };

  const start = timeToMin(d.startTime);
  const end = start + d.durationMin;
  const days = new Set(PATTERN_WEEKDAYS[d.pattern] ?? []);

  // Two timetable entries clash when they share a weekday, their times overlap,
  // and they use the same teacher or room. ODD and EVEN patterns never share a
  // day, so only same-pattern entries can conflict.
  const others = await prisma.classSchedule.findMany({
    where: { id: d.id ? { not: d.id } : undefined },
    include: { group: { select: { teacherId: true } } },
  });
  for (const o of others) {
    const shareDay = (PATTERN_WEEKDAYS[o.pattern] ?? []).some((w) => days.has(w));
    if (!shareDay) continue;
    const oStart = timeToMin(o.startTime);
    const oEnd = oStart + o.durationMin;
    if (!(start < oEnd && oStart < end)) continue;
    if (group.teacherId && o.group.teacherId === group.teacherId) {
      return { error: "teacherBusy" };
    }
    if (d.roomId && o.roomId === d.roomId) {
      return { error: "roomBusy" };
    }
  }

  if (d.id) {
    await prisma.classSchedule.update({
      where: { id: d.id },
      data: {
        pattern: d.pattern,
        startTime: d.startTime,
        durationMin: d.durationMin,
        roomId: d.roomId,
      },
    });
  } else {
    await prisma.classSchedule.create({
      data: {
        groupId: d.groupId,
        pattern: d.pattern,
        startTime: d.startTime,
        durationMin: d.durationMin,
        roomId: d.roomId,
      },
    });
  }

  await generateUpcomingLessons(d.groupId);
  revalidateSchedule();
  return { ok: true };
}

export async function deleteSchedule(id: string) {
  await requireRole(ROLES.ADMIN);
  await prisma.classSchedule.delete({ where: { id } });
  revalidateSchedule();
}

/**
 * Generate concrete lessons for the next GENERATE_WEEKS weeks from a class's
 * timetable. Idempotent and non-destructive: never creates a lesson for a
 * (group, startAt) that already exists, and never touches past lessons.
 */
async function generateUpcomingLessons(groupId: string): Promise<number> {
  const schedules = await prisma.classSchedule.findMany({ where: { groupId } });
  if (schedules.length === 0) return 0;

  const now = new Date();
  const base = startOfWeek(now);

  // Existing lesson start times for this group, to avoid duplicates.
  const existing = await prisma.lesson.findMany({
    where: { groupId },
    select: { startAt: true },
  });
  const seen = new Set(existing.map((l) => l.startAt.getTime()));

  const toCreate: {
    groupId: string;
    startAt: Date;
    endAt: Date;
    roomId: string | null;
    status: string;
  }[] = [];

  for (let w = 0; w < GENERATE_WEEKS; w++) {
    const weekStart = addDays(base, w * 7);
    for (const s of schedules) {
      const [hh, mm] = s.startTime.split(":").map(Number);
      for (const weekday of PATTERN_WEEKDAYS[s.pattern] ?? []) {
        const day = addDays(weekStart, weekday - 1); // weekday 1=Mon → +0
        const startAt = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          hh,
          mm,
          0,
          0,
        );
        if (startAt.getTime() < now.getTime()) continue; // upcoming only
        if (seen.has(startAt.getTime())) continue;
        seen.add(startAt.getTime());
        const endAt = new Date(startAt.getTime() + s.durationMin * 60_000);
        toCreate.push({
          groupId,
          startAt,
          endAt,
          roomId: s.roomId,
          status: LESSON_STATUS.SCHEDULED,
        });
      }
    }
  }

  if (toCreate.length) await prisma.lesson.createMany({ data: toCreate });
  return toCreate.length;
}

/** Manual "Generate lessons" trigger (admin). */
export async function regenerateLessons(groupId: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  await generateUpcomingLessons(groupId);
  revalidateSchedule();
  return { ok: true };
}

/* ------------------------------ Lessons ------------------------------ */

/** True when the current user may manage the given lesson's group. */
async function canManageGroup(groupId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  if (session.role === ROLES.ADMIN) return true;
  if (session.role === ROLES.TEACHER) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { teacherId: true },
    });
    return group?.teacherId === session.userId;
  }
  return false;
}

export async function saveLesson(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([ROLES.ADMIN, ROLES.TEACHER]);
  const parsed = lessonSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    groupId: formData.get("groupId"),
    title: (formData.get("title") as string) || null,
    type: formData.get("type") || "LESSON",
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    roomId: (formData.get("roomId") as string) || null,
  });
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;

  if (!(await canManageGroup(d.groupId))) return { error: "forbidden" };

  const startAt = combine(d.date, d.startTime);
  const endAt = combine(d.date, d.endTime);
  if (endAt.getTime() <= startAt.getTime()) return { error: "invalidTime" };

  try {
    if (d.id) {
      await prisma.lesson.update({
        where: { id: d.id },
        data: { title: d.title, type: d.type, startAt, endAt, roomId: d.roomId },
      });
    } else {
      await prisma.lesson.create({
        data: {
          groupId: d.groupId,
          title: d.title,
          type: d.type,
          startAt,
          endAt,
          roomId: d.roomId,
          status: LESSON_STATUS.SCHEDULED,
        },
      });
    }
  } catch {
    return { error: "lessonExists" };
  }
  revalidateSchedule();
  return { ok: true };
}

/** Toggle a lesson between SCHEDULED and CANCELLED. */
export async function toggleLessonCancelled(id: string): Promise<ActionState> {
  await requireRole([ROLES.ADMIN, ROLES.TEACHER]);
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { groupId: true, status: true },
  });
  if (!lesson) return { error: "invalid" };
  if (!(await canManageGroup(lesson.groupId))) return { error: "forbidden" };
  await prisma.lesson.update({
    where: { id },
    data: {
      status:
        lesson.status === LESSON_STATUS.CANCELLED
          ? LESSON_STATUS.SCHEDULED
          : LESSON_STATUS.CANCELLED,
    },
  });
  revalidateSchedule();
  return { ok: true };
}

export async function deleteLesson(id: string): Promise<ActionState> {
  await requireRole([ROLES.ADMIN, ROLES.TEACHER]);
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { groupId: true },
  });
  if (!lesson) return { error: "invalid" };
  if (!(await canManageGroup(lesson.groupId))) return { error: "forbidden" };
  await prisma.lesson.delete({ where: { id } });
  revalidateSchedule();
  return { ok: true };
}

/* ----------------------------- Attendance ----------------------------- */

export async function markAttendance(
  lessonId: string,
  entries: { studentId: string; status: string; reason?: string | null }[],
): Promise<ActionState> {
  await requireRole([ROLES.ADMIN, ROLES.TEACHER]);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { groupId: true, group: { select: { students: { select: { id: true } } } } },
  });
  if (!lesson) return { error: "invalid" };
  if (!(await canManageGroup(lesson.groupId))) return { error: "forbidden" };

  const enrolled = new Set(lesson.group.students.map((s) => s.id));

  const clean: { studentId: string; status: string; reason: string | null }[] = [];
  for (const raw of entries) {
    const parsed = attendanceItemSchema.safeParse(raw);
    if (!parsed.success) return { error: "invalid" };
    if (!enrolled.has(parsed.data.studentId)) continue; // ignore non-members
    clean.push({
      studentId: parsed.data.studentId,
      status: parsed.data.status,
      reason:
        parsed.data.status === ATTENDANCE_STATUS.ABSENT ? parsed.data.reason : null,
    });
  }

  await prisma.$transaction(
    clean.map((c) =>
      prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId, studentId: c.studentId } },
        create: {
          lessonId,
          studentId: c.studentId,
          status: c.status,
          reason: c.reason,
        },
        update: { status: c.status, reason: c.reason, markedAt: new Date() },
      }),
    ),
  );

  revalidateSchedule();
  return { ok: true };
}
