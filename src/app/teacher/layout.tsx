import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { AppShell } from "@/components/layout/app-shell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(ROLES.TEACHER);
  return (
    <AppShell role={ROLES.TEACHER} user={{ name: session.name, email: session.email }}>
      {children}
    </AppShell>
  );
}
