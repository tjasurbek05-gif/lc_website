import { requireRole } from "@/lib/auth";
import { ROLE_ORDER, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireRole(ROLES.ADMIN);
  const sp = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  // Group by role in the canonical order (admins, then teachers, then students),
  // keeping names alphabetical within each role.
  const userRows = users
    .map((u) => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, active: u.active }))
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99) ||
        a.name.localeCompare(b.name),
    );

  return <UsersManager users={userRows} initialNewRole={sp.new ?? null} />;
}
