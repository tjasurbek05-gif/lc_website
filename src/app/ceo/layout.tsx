import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { AppShell } from "@/components/layout/app-shell";

export default async function CeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(ROLES.CEO);
  return (
    <AppShell role={ROLES.CEO} user={{ name: session.name, phone: session.phone }}>
      {children}
    </AppShell>
  );
}
