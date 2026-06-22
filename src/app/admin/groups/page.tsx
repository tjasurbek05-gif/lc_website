import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { GroupsManager } from "@/components/admin/groups-manager";

export default async function AdminGroupsPage() {
  await requireRole(ROLES.ADMIN);
  const groups = await prisma.group.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  });

  const rows = groups.map((g) => ({
    id: g.id,
    name: g.name,
    count: g._count.students,
  }));

  return <GroupsManager groups={rows} />;
}
