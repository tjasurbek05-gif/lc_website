import { requireRole } from "@/lib/auth";
import { PATTERN_WEEKDAYS, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { ScheduleManager } from "@/components/admin/schedule-manager";

/** "HH:MM" + minutes → "HH:MM" (wraps at 24h, fine for same-day lessons). */
function addMinutes(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + min) % (24 * 60);
  const H = Math.floor(total / 60);
  const M = total % 60;
  return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
}

export type Slot = { label: string; time: string };
export type GridRow = { id: string; name: string; days: Slot[][] };

export default async function AdminSchedulePage() {
  await requireRole(ROLES.ADMIN);

  const [rooms, teachers, schedules] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: ROLES.TEACHER },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.classSchedule.findMany({
      include: {
        group: {
          select: {
            name: true,
            teacherId: true,
            subject: { select: { name: true } },
          },
        },
        room: { select: { id: true, name: true } },
      },
    }),
  ]);

  const emptyDays = (): Slot[][] => [[], [], [], [], [], [], []];

  // Teacher availability: which slots each teacher is booked, per weekday.
  const teacherRows: GridRow[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    days: emptyDays(),
  }));
  const teacherById = new Map(teacherRows.map((r) => [r.id, r]));

  // Room availability, per weekday.
  const roomRows: GridRow[] = rooms.map((r) => ({
    id: r.id,
    name: r.name,
    days: emptyDays(),
  }));
  const roomById = new Map(roomRows.map((r) => [r.id, r]));

  for (const s of schedules) {
    const time = `${s.startTime}–${addMinutes(s.startTime, s.durationMin)}`;
    const label = `${s.group.subject.name} · ${s.group.name}`;
    // A pattern (ODD/EVEN) occupies each of its weekdays.
    for (const weekday of PATTERN_WEEKDAYS[s.pattern] ?? []) {
      const idx = weekday - 1;
      if (s.group.teacherId) {
        teacherById.get(s.group.teacherId)?.days[idx].push({ label, time });
      }
      if (s.roomId) {
        roomById.get(s.roomId)?.days[idx].push({ label, time });
      }
    }
  }

  const roomData = rooms.map((r) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
  }));

  return (
    <ScheduleManager
      rooms={roomData}
      teacherRows={teacherRows}
      roomRows={roomRows}
    />
  );
}
