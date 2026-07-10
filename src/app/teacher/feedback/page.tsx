import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";

export default async function TeacherFeedbackPage() {
  const session = await requireRole(ROLES.TEACHER);
  const t = await getTranslations("feedback");
  const locale = await getLocale();

  const received = await prisma.teacherFeedback.findMany({
    where: { teacherId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true } },
      group: { select: { name: true, subject: { select: { name: true } } } },
    },
  });

  return (
    <div>
      <PageHeader title={t("teacherTitle")} description={t("teacherHint")} />
      {received.length === 0 ? (
        <EmptyState title={t("noHistory")} icon={<MessageSquare />} />
      ) : (
        <div className="space-y-3">
          {received.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{f.student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(f.createdAt, locale)}
                    {f.group ? ` · ${f.group.subject.name} · ${f.group.name}` : ""}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{f.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
