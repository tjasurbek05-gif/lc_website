import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireRole(ROLES.ADMIN);
  const sp = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const userRows = users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
  }));

  return <UsersManager users={userRows} initialNewRole={sp.new ?? null} />;
}
