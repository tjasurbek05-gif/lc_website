import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(ROLES.ADMIN);
  return (
    <AppShell role={ROLES.ADMIN} user={{ name: session.name, phone: session.phone }}>
      {children}
    </AppShell>
  );
}
