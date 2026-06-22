import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager";

export default async function AdminUsersPage() {
  await requireRole(ROLES.ADMIN);
  const [users, groups] = await Promise.all([
    prisma.user.findMany({
      include: { group: { select: { name: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const userRows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    groupId: u.groupId,
    groupName: u.group?.name ?? null,
  }));

  return <UsersManager users={userRows} groups={groups} />;
}
