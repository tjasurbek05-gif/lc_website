"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  Pencil,
  Receipt,
  Search,
  Undo2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { EARLY_PAYMENT_DAY } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  getReceiptData,
  recordPayment,
  setEarlyPaymentBonus,
  setFinanceInfo,
  setTuitionFee,
  undoLastPayment,
  type ReceiptData,
} from "@/app/actions/finance";
import { PaymentReceipt } from "@/components/admin/payment-receipt";

type GroupOption = {
  id: string;
  label: string;
  teacherId: string | null;
  teacherName: string | null;
};

export type StudentFinanceRow = {
  id: string;
  name: string;
  phone: string;
  coins: number;
  status: "GOOD" | "OVERDUE" | "NONE";
  dueDate: string | null;
  dueAmount: number | null;
  lastPaidAt: string | null;
  lastAmount: number | null;
  groups: GroupOption[];
  history: { id: string; amount: number; paidAt: string; bonusCoins: number }[];
};

export type CalendarCell = {
  day: number;
  date: string;
  isToday: boolean;
  due: { id: string; name: string; overdue: boolean }[];
  paid: { id: string; name: string }[];
};

type FinanceStats = {
  total: number;
  good: number;
  overdue: number;
  none: number;
  revenueThisView: number;
  revenueThisMonth: number;
};

const METHODS = ["CASH", "CLICK", "CARD", "TRANSFER"] as const;

function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localeToLang(locale: string): "uz" | "ru" | "en" {
  return locale === "uz" ? "uz" : locale === "ru" ? "ru" : "en";
}

export function FinanceManager({
  fee,
  earlyBonusCoins,
  companyName,
  branchName,
  teachers,
  monthOffset,
  monthLabel,
  leadingBlanks,
  cells,
  students,
  stats,
  locale,
  title,
  hint,
}: {
  fee: number;
  earlyBonusCoins: number;
  companyName: string;
  branchName: string | null;
  teachers: { id: string; name: string }[];
  monthOffset: number;
  monthLabel: string;
  leadingBlanks: number;
  cells: CalendarCell[];
  students: StudentFinanceRow[];
  stats: FinanceStats;
  locale: string;
  title: string;
  hint: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const tm = useTranslations("methods");
  const pathname = usePathname();
  const router = useRouter();

  const [feeOpen, setFeeOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<StudentFinanceRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState<StudentFinanceRow | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [query, setQuery] = useState("");

  // Controlled fields for the record-payment modal (to preview the split).
  const [amount, setAmount] = useState<number>(0);
  const [paidAtInput, setPaidAtInput] = useState<string>(todayInput());
  const [groupId, setGroupId] = useState<string>("");
  const [shareTeacherId, setShareTeacherId] = useState<string>("");
  const [sharePct, setSharePct] = useState<string>("");

  const monthHref = (offset: number) => `${pathname}?month=${offset}`;
  const byId = new Map(students.map((s) => [s.id, s]));

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q),
    );
  }, [students, query]);

  const shareAmount =
    shareTeacherId && Number(sharePct) > 0
      ? Math.round((amount * Number(sharePct)) / 100)
      : 0;

  const paidDay = Number(paidAtInput.split("-")[2]);
  const bonusEligible =
    earlyBonusCoins > 0 && Number.isFinite(paidDay) && paidDay <= EARLY_PAYMENT_DAY;

  async function onFeeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await setTuitionFee({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setFeeOpen(false);
      router.refresh();
    } else setError(res?.error);
  }

  async function onBonusSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await setEarlyPaymentBonus({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setBonusOpen(false);
      router.refresh();
    } else setError(res?.error);
  }

  async function onInfoSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await setFinanceInfo({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setInfoOpen(false);
      router.refresh();
    } else setError(res?.error);
  }

  async function onPaySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await recordPayment({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setPayOpen(null);
      router.refresh();
      if (res.paymentId) {
        const data = await getReceiptData(res.paymentId);
        if (data) setReceipt(data);
      }
    } else setError(res?.error);
  }

  async function openReceipt(paymentId: string) {
    const data = await getReceiptData(paymentId);
    if (data) setReceipt(data);
  }

  async function onUndo(row: StudentFinanceRow) {
    if (!window.confirm(t("undoPaymentConfirm"))) return;
    await undoLastPayment(row.id);
    router.refresh();
  }

  function openPay(row: StudentFinanceRow) {
    setError(undefined);
    setAmount(row.dueAmount ?? fee);
    setPaidAtInput(todayInput());
    const firstGroup = row.groups[0];
    setGroupId(firstGroup?.id ?? "");
    setShareTeacherId(firstGroup?.teacherId ?? "");
    setSharePct("");
    setPayOpen(row);
  }

  function onGroupChange(id: string) {
    setGroupId(id);
    const g = payOpen?.groups.find((x) => x.id === id);
    if (g?.teacherId) setShareTeacherId(g.teacherId);
  }

  function statusBadge(status: StudentFinanceRow["status"]) {
    if (status === "GOOD") return <Badge variant="success">{t("paidStatus")}</Badge>;
    if (status === "OVERDUE") return <Badge variant="danger">{t("overdueStatus")}</Badge>;
    return <Badge variant="outline">{t("noPaymentsStatus")}</Badge>;
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={hint}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInfoOpen(true)}>
              <Building2 />
              {t("receiptInfo")}
            </Button>
            <Button variant="outline" onClick={() => setFeeOpen(true)}>
              <Pencil />
              {t("editFee")}
            </Button>
            <Button variant="outline" onClick={() => setBonusOpen(true)}>
              <Coins />
              {t("editCoinBonus")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t("fixedFee")} value={formatCurrency(fee, locale)} icon={<Banknote />} />
        <StatCard label={t("totalStudents")} value={stats.total} icon={<Users />} />
        <StatCard
          label={t("studentsPaidUp")}
          value={stats.good}
          icon={<CheckCircle2 />}
          accent="success"
        />
        <StatCard
          label={t("overdueStudents")}
          value={stats.overdue}
          icon={<AlertTriangle />}
          accent={stats.overdue > 0 ? "danger" : "primary"}
        />
        <StatCard
          label={t("revenueThisMonth")}
          value={formatCurrency(stats.revenueThisMonth, locale)}
          icon={<Banknote />}
          accent="success"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("calendarTitle")}</CardTitle>
            <div className="flex items-center rounded-lg border border-border">
              <Link
                href={monthHref(monthOffset - 1)}
                className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
                aria-label={t("prevMonth")}
              >
                <ChevronLeft className="size-4" />
              </Link>
              <Link
                href={monthHref(0)}
                className="border-x border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {t("thisMonth")}
              </Link>
              <Link
                href={monthHref(monthOffset + 1)}
                className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
                aria-label={t("nextMonth")}
              >
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{monthLabel}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {cells.map((cell) => (
              <div
                key={cell.date}
                className={cn(
                  "min-h-16 rounded-lg border border-border p-1.5",
                  cell.isToday && "border-primary bg-primary/5",
                )}
              >
                <p className={cn("mb-1 font-semibold", cell.isToday && "text-primary")}>
                  {cell.day}
                </p>
                <div className="space-y-0.5">
                  {cell.paid.map((p, i) => (
                    <p
                      key={`paid-${p.id}-${i}`}
                      className="truncate rounded bg-success/10 px-1 py-0.5 text-success"
                      title={p.name}
                    >
                      {p.name}
                    </p>
                  ))}
                  {cell.due.map((d, i) => {
                    const row = byId.get(d.id);
                    return (
                      <button
                        key={`due-${d.id}-${i}`}
                        type="button"
                        onClick={() => row && openPay(row)}
                        className={cn(
                          "block w-full truncate rounded px-1 py-0.5 text-left",
                          d.overdue
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning",
                        )}
                        title={d.name}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("paymentsTitle")}</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tc("searchByNamePhone")}
                className="h-9 pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {students.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t("noStudents")} icon={<Users />} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-5">
              <EmptyState title={tc("noResults")} />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{tc("student")}</TH>
                  <TH>{t("coinsColumn")}</TH>
                  <TH>{t("statusLabel")}</TH>
                  <TH>{t("nextDue")}</TH>
                  <TH>{t("lastPaid")}</TH>
                  <TH className="pr-5 text-right">{tc("actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {filteredStudents.map((s) => (
                  <TR key={s.id}>
                    <TD className="pl-5">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.phone}</p>
                      </div>
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Coins className="size-3.5 text-warning" />
                        {s.coins}
                      </span>
                    </TD>
                    <TD>{statusBadge(s.status)}</TD>
                    <TD className="text-muted-foreground">
                      {s.dueDate ? (
                        <>
                          {formatDate(s.dueDate, locale)}
                          {s.dueAmount ? (
                            <span className="ml-1 text-xs">
                              ({formatCurrency(s.dueAmount, locale)})
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="text-muted-foreground">
                      {s.lastPaidAt ? (
                        <>
                          {formatDate(s.lastPaidAt, locale)}
                          {s.lastAmount ? (
                            <span className="ml-1 text-xs">
                              ({formatCurrency(s.lastAmount, locale)})
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="pr-5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" onClick={() => openPay(s)}>
                          {t("recordPayment")}
                        </Button>
                        {s.history.length ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openReceipt(s.history[0].id)}
                              aria-label={t("receipt")}
                            >
                              <Receipt />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setHistoryOpen(s)}
                              aria-label={t("history")}
                            >
                              <History />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onUndo(s)}
                              aria-label={t("undoPayment")}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Undo2 />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fee modal */}
      <Modal open={feeOpen} onClose={() => setFeeOpen(false)} title={t("setFeeTitle")}>
        <form onSubmit={onFeeSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fee">{t("feeLabel")}</Label>
            <Input id="fee" name="fee" type="number" min={0} step={1000} defaultValue={fee} required />
          </div>
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {te(error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setFeeOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Early-payment coin bonus modal */}
      <Modal open={bonusOpen} onClose={() => setBonusOpen(false)} title={t("setCoinBonusTitle")}>
        <form onSubmit={onBonusSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bonusCoins">{t("coinBonusLabel", { day: EARLY_PAYMENT_DAY })}</Label>
            <Input
              id="bonusCoins"
              name="bonusCoins"
              type="number"
              min={0}
              step={1}
              defaultValue={earlyBonusCoins}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("coinBonusHint", { day: EARLY_PAYMENT_DAY })}
            </p>
          </div>
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {te(error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setBonusOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Company/branch (receipt info) modal */}
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title={t("receiptInfoTitle")}>
        <form onSubmit={onInfoSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">{t("companyName")}</Label>
            <Input id="companyName" name="companyName" defaultValue={companyName} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branchName">
              {t("branchName")}{" "}
              <span className="font-normal text-muted-foreground">({tc("optional")})</span>
            </Label>
            <Input id="branchName" name="branchName" defaultValue={branchName ?? ""} />
          </div>
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {te(error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setInfoOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record payment modal */}
      <Modal
        open={payOpen !== null}
        onClose={() => setPayOpen(null)}
        title={t("recordPaymentTitle")}
        description={payOpen?.name}
      >
        {payOpen ? (
          <form onSubmit={onPaySubmit} className="space-y-4">
            <input type="hidden" name="studentId" value={payOpen.id} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">{tc("amount")}</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min={0}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paidAt">{t("paidOn")}</Label>
                <Input
                  id="paidAt"
                  name="paidAt"
                  type="date"
                  value={paidAtInput}
                  onChange={(e) => setPaidAtInput(e.target.value)}
                  required
                />
              </div>
            </div>

            {earlyBonusCoins > 0 ? (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-xs",
                  bonusEligible
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Coins className="mr-1 inline size-3.5 align-text-bottom" />
                {bonusEligible
                  ? t("coinBonusFieldHintEligible", { amount: earlyBonusCoins })
                  : t("coinBonusFieldHint", { day: EARLY_PAYMENT_DAY, amount: earlyBonusCoins })}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="method">{t("methodLabel")}</Label>
              <Select id="method" name="method" defaultValue="CASH">
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {tm(m)}
                  </option>
                ))}
              </Select>
            </div>

            {payOpen.groups.length ? (
              <div className="space-y-1.5">
                <Label htmlFor="groupId">
                  {t("classLabel")}{" "}
                  <span className="font-normal text-muted-foreground">({tc("optional")})</span>
                </Label>
                <Select
                  id="groupId"
                  name="groupId"
                  value={groupId}
                  onChange={(e) => onGroupChange(e.target.value)}
                >
                  <option value="">{tc("none")}</option>
                  {payOpen.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {/* Teacher revenue-share */}
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-medium">{t("teacherShareTitle")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="teacherId">{t("teacherLabel")}</Label>
                  <Select
                    id="teacherId"
                    name="teacherId"
                    value={shareTeacherId}
                    onChange={(e) => setShareTeacherId(e.target.value)}
                  >
                    <option value="">{tc("none")}</option>
                    {teachers.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="teacherSharePct">{t("percentLabel")}</Label>
                  <Input
                    id="teacherSharePct"
                    name="teacherSharePct"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="0"
                    value={sharePct}
                    onChange={(e) => setSharePct(e.target.value)}
                    disabled={!shareTeacherId}
                  />
                </div>
              </div>
              {shareAmount > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("teacherGets", { amount: formatCurrency(shareAmount, locale) })}
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {te(error)}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setPayOpen(null)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? tc("saving") : t("saveAndReceipt")}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* History modal */}
      <Modal
        open={historyOpen !== null}
        onClose={() => setHistoryOpen(null)}
        title={t("historyTitle")}
        description={historyOpen?.name}
      >
        {historyOpen ? (
          historyOpen.history.length ? (
            <div className="max-h-[52vh] space-y-2 overflow-y-auto">
              {historyOpen.history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDate(h.paidAt, locale)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(h.amount, locale)}</span>
                    {h.bonusCoins > 0 ? (
                      <Badge variant="warning" className="gap-1">
                        <Coins className="size-3" />
                        {t("bonusBadge", { amount: h.bonusCoins })}
                      </Badge>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openReceipt(h.id)}
                      aria-label={t("receipt")}
                    >
                      <Receipt />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t("noHistory")} icon={<History />} />
          )
        ) : null}
      </Modal>

      {receipt ? (
        <PaymentReceipt
          data={receipt}
          defaultLang={localeToLang(locale)}
          onClose={() => setReceipt(null)}
        />
      ) : null}
    </div>
  );
}
