import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { AppShell } from "@/components/layout/app-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(ROLES.STUDENT);
  return (
    <AppShell role={ROLES.STUDENT} user={{ name: session.name, phone: session.phone }}>
      {children}
    </AppShell>
  );
}
