import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { RoomsManager, type RoomCard } from "@/components/admin/rooms-manager";

export default async function AdminRoomsPage() {
  await requireRole(ROLES.ADMIN);

  const [rooms, teachers] = await Promise.all([
    prisma.room.findMany({
      orderBy: { name: "asc" },
      include: {
        assignments: {
          orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          include: { teacher: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: ROLES.TEACHER },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const roomCards: RoomCard[] = rooms.map((r) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    assignments: r.assignments.map((a) => ({
      id: a.id,
      teacherId: a.teacher.id,
      teacherName: a.teacher.name,
      weekday: a.weekday,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
  }));

  return <RoomsManager rooms={roomCards} teachers={teachers} />;
}
