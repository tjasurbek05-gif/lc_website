import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { averagePercent, toPercent } from "@/lib/metrics";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { ScoreBadge } from "@/components/score-badge";

export default async function StudentGradesPage() {
  const session = await requireRole(ROLES.STUDENT);
  const grades = await prisma.grade.findMany({
    where: { studentId: session.userId },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  const t = await getTranslations("student");
  const tc = await getTranslations("common");
  const tg = await getTranslations("gradeTypes");
  const locale = await getLocale();

  type Row = (typeof grades)[number];
  const groups = new Map<string, { name: string; items: Row[] }>();
  for (const g of grades) {
    const entry = groups.get(g.subject.id) ?? { name: g.subject.name, items: [] };
    entry.items.push(g);
    groups.set(g.subject.id, entry);
  }
  const sections = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader title={t("myGradesTitle")} />

      {sections.length === 0 ? (
        <EmptyState title={t("noGrades")} icon={<ClipboardList />} />
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const avg = averagePercent(
              section.items.map((g) => ({
                value: g.value,
                maxValue: g.maxValue,
                date: g.date,
                type: g.type,
                subjectId: g.subjectId,
              })),
            );
            return (
              <Card key={section.name}>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle>{section.name}</CardTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {section.items.length} {tc("grade").toLowerCase()}
                    </span>
                    <ScoreBadge percent={avg} />
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <Table>
                    <THead>
                      <TR>
                        <TH className="pl-5">{tc("date")}</TH>
                        <TH>{tc("type")}</TH>
                        <TH>{tc("comment")}</TH>
                        <TH className="pr-5 text-right">{tc("grade")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {section.items.map((g) => (
                        <TR key={g.id}>
                          <TD className="pl-5 text-muted-foreground">
                            {formatDate(g.date, locale)}
                          </TD>
                          <TD>
                            <Badge variant="outline">{tg(g.type)}</Badge>
                          </TD>
                          <TD className="text-muted-foreground">{g.comment || "—"}</TD>
                          <TD className="pr-5 text-right">
                            <ScoreBadge
                              percent={toPercent(g.value, g.maxValue)}
                              showLetter={false}
                            />
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
