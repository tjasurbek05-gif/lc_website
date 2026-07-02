import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/page-header";
import { OrdersBoard } from "@/components/admin/orders-board";

export default async function AdminDashboard() {
  await requireRole(ROLES.ADMIN);
  const t = await getTranslations("admin");
  const ts = await getTranslations("shop");

  const [students, teachers, groups, subjects, orders] = await Promise.all([
    prisma.user.count({ where: { role: ROLES.STUDENT } }),
    prisma.user.count({ where: { role: ROLES.TEACHER } }),
    prisma.group.count(),
    prisma.subject.count(),
    prisma.order.findMany({
      where: { status: ORDER_STATUS.PENDING },
      include: { student: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const orderRows = orders.map((o) => ({
    id: o.id,
    studentName: o.student.name,
    productName: o.productName,
    coinsSpent: o.coinsSpent,
  }));

  const quickActions = [
    {
      href: "/admin/users?new=student",
      label: t("addStudent"),
      icon: <UserPlus />,
      tone: "from-violet-500 to-indigo-500",
    },
    {
      href: "/admin/users?new=teacher",
      label: t("addTeacher"),
      icon: <GraduationCap />,
      tone: "from-cyan-500 to-blue-500",
    },
    {
      href: "/admin/subjects?new=1",
      label: t("addSubject"),
      icon: <Plus />,
      tone: "from-fuchsia-500 to-pink-500",
    },
  ];

  return (
    <div>
      <PageHeader title={t("title")} description={t("gettingStarted")} />

      {/* Quick actions — the few things an admin needs most often. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${a.tone} text-white shadow-sm [&_svg]:size-5`}
              >
                {a.icon}
              </span>
              <span className="font-medium">{a.label}</span>
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalStudents")} value={students} icon={<Users />} />
        <StatCard
          label={t("totalTeachers")}
          value={teachers}
          icon={<GraduationCap />}
          accent="success"
        />
        <StatCard
          label={t("totalGroups")}
          value={groups}
          icon={<Layers />}
          accent="warning"
        />
        <StatCard label={t("totalSubjects")} value={subjects} icon={<BookOpen />} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{ts("allOrders")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <OrdersBoard orders={orderRows} />
        </CardContent>
      </Card>
    </div>
  );
}
