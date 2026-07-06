import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Coins, Sparkles, TrendingUp, Trophy, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { paymentStatus } from "@/lib/finance";
import { addDays, cn, formatCurrency, formatDate, startOfWeek } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  CoinsProgress,
  type ProgressChunk,
} from "@/components/charts/coins-progress";

function intlLocale(locale: string): string {
  return locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";
}

export default async function StudentDashboard() {
  const session = await requireRole(ROLES.STUDENT);
  const locale = await getLocale();
  const now = new Date();

  const [me, coinRecords, recent, openPayment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { coins: true, enrolledGroups: { select: { id: true } } },
    }),
    // Every coin change (from lessons) drives the weekly-progress chart.
    prisma.attendance.findMany({
      where: { studentId: session.userId, coins: { not: 0 } },
      select: { coins: true, lesson: { select: { startAt: true } } },
    }),
    // The most recent coin gains/losses, with the lesson's date and type.
    prisma.attendance.findMany({
      where: { studentId: session.userId, coins: { not: 0 } },
      select: {
        id: true,
        coins: true,
        lesson: { select: { startAt: true, type: true } },
      },
      orderBy: { lesson: { startAt: "desc" } },
      take: 10,
    }),
    prisma.payment.findFirst({
      where: { studentId: session.userId, paidAt: null },
      orderBy: { dueDate: "desc" },
    }),
  ]);

  const t = await getTranslations("student");
  const tc = await getTranslations("common");
  const tl = await getTranslations("lessons");

  const coins = me?.coins ?? 0;

  // --- Rank in group, by coin balance only ---
  let rank: number | null = null;
  let groupSize = 0;
  const myGroupIds = (me?.enrolledGroups ?? []).map((g) => g.id);
  if (myGroupIds.length) {
    const peers = await prisma.user.findMany({
      where: {
        role: ROLES.STUDENT,
        enrolledGroups: { some: { id: { in: myGroupIds } } },
      },
      select: { id: true, coins: true },
    });
    const ranked = peers.sort((a, b) => b.coins - a.coins);
    groupSize = ranked.length;
    const idx = ranked.findIndex((r) => r.id === session.userId);
    rank = idx >= 0 ? idx + 1 : null;
  }

  // --- Weekly coins, split into 3-month chunks from the first lesson to now ---
  const weekSum = new Map<number, number>();
  for (const a of coinRecords) {
    const ws = startOfWeek(a.lesson.startAt).getTime();
    weekSum.set(ws, (weekSum.get(ws) ?? 0) + a.coins);
  }
  const times = coinRecords.map((a) => a.lesson.startAt.getTime());
  const firstDate = times.length ? new Date(Math.min(...times)) : now;

  const weekLabelFmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
  });
  const monthFmt = new Intl.DateTimeFormat(intlLocale(locale), { month: "short" });

  const chunks: ProgressChunk[] = [];
  let anchor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  while (anchor.getTime() <= now.getTime()) {
    const chunkEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 3, 1);
    const weeks: { label: string; coins: number }[] = [];
    let ws = startOfWeek(anchor);
    while (ws.getTime() < chunkEnd.getTime() && ws.getTime() <= now.getTime()) {
      weeks.push({
        label: weekLabelFmt.format(ws),
        coins: weekSum.get(ws.getTime()) ?? 0,
      });
      ws = addDays(ws, 7);
    }
    if (weeks.length) {
      const lastMonth = new Date(chunkEnd.getFullYear(), chunkEnd.getMonth() - 1, 1);
      chunks.push({
        key: `${anchor.getFullYear()}-${anchor.getMonth()}`,
        label: `${monthFmt.format(anchor)} – ${monthFmt.format(lastMonth)} ${lastMonth.getFullYear()}`,
        weeks,
      });
    }
    anchor = chunkEnd;
  }

  // Coins collected in the current week (a friendly extra stat).
  const thisWeek = weekSum.get(startOfWeek(now).getTime()) ?? 0;

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("welcome", { name: session.name })}
      />

      {openPayment ? (
        (() => {
          const status = paymentStatus(openPayment, new Date());
          const overdue = status === "OVERDUE";
          return (
            <Card
              className={cn(
                "mb-6 flex items-center gap-3 p-4",
                overdue && "border-destructive/40 bg-destructive/5",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg text-white [&_svg]:size-5",
                  overdue
                    ? "bg-gradient-to-br from-rose-500 to-pink-500"
                    : "bg-brand-gradient",
                )}
              >
                {overdue ? <AlertTriangle /> : <Wallet />}
              </span>
              <p className="text-sm font-medium">
                {overdue
                  ? t("paymentOverdue", {
                      date: formatDate(openPayment.dueDate, locale),
                      amount: formatCurrency(openPayment.amount, locale),
                    })
                  : t("paymentDue", {
                      date: formatDate(openPayment.dueDate, locale),
                      amount: formatCurrency(openPayment.amount, locale),
                    })}
              </p>
            </Card>
          );
        })()
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("coinBalance")}
          value={coins}
          icon={<Coins />}
          accent={coins < 0 ? "danger" : "warning"}
        />
        {rank ? (
          <StatCard
            label={t("rank")}
            value={`#${rank}`}
            hint={`/ ${groupSize}`}
            icon={<Trophy />}
            accent="primary"
          />
        ) : (
          <StatCard label={t("rank")} value="—" icon={<Trophy />} accent="primary" />
        )}
        <StatCard
          label={t("coinsThisWeek")}
          value={thisWeek > 0 ? `+${thisWeek}` : `${thisWeek}`}
          icon={<Sparkles />}
          accent="success"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("progressTitle")}</CardTitle>
          <CardDescription>{t("progressSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {chunks.length ? (
            <CoinsProgress chunks={chunks} />
          ) : (
            <EmptyState title={t("noCoinsYet")} icon={<TrendingUp />} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("recentCoinsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recent.length ? (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{tc("date")}</TH>
                  <TH>{tc("type")}</TH>
                  <TH className="pr-5 text-right">{tl("coins")}</TH>
                </TR>
              </THead>
              <TBody>
                {recent.map((a) => (
                  <TR key={a.id}>
                    <TD className="pl-5 font-medium">
                      {formatDate(a.lesson.startAt, locale)}
                    </TD>
                    <TD>
                      <Badge
                        variant={a.lesson.type === "EXAM" ? "warning" : "outline"}
                      >
                        {tl(a.lesson.type === "EXAM" ? "typeExam" : "typeTypical")}
                      </Badge>
                    </TD>
                    <TD className="pr-5 text-right">
                      <span
                        className={
                          a.coins < 0
                            ? "font-semibold text-destructive"
                            : "font-semibold text-success"
                        }
                      >
                        {a.coins > 0 ? `+${a.coins}` : a.coins}
                      </span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="p-5">
              <EmptyState title={t("noCoinsYet")} icon={<Coins />} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
