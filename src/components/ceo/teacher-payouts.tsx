"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, GraduationCap, Pencil, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  setTeacherSalary,
  toggleShareConfirmation,
  toggleTeacherPayout,
} from "@/app/actions/finance";

export type TeacherRow = {
  id: string;
  name: string;
  phone: string;
  salary: number;
  paidAt: string | null;
  confirmedSharesThisMonth: number;
  pendingSharesTotal: number;
};

export type PendingShareRow = {
  id: string;
  teacherName: string;
  studentName: string;
  amount: number;
  sharePct: number;
  shareAmount: number;
  paidAt: string;
};

export function TeacherPayouts({
  teachers,
  pendingShares,
  period,
  periodLabel,
  locale,
  title,
  hint,
}: {
  teachers: TeacherRow[];
  pendingShares: PendingShareRow[];
  period: string;
  periodLabel: string;
  locale: string;
  title: string;
  hint: string;
}) {
  const t = useTranslations("ceo");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();

  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function onSalarySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await setTeacherSalary({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setEditing(null);
      router.refresh();
    } else setError(res?.error);
  }

  async function onToggle(row: TeacherRow) {
    setTogglingId(row.id);
    await toggleTeacherPayout(row.id, period);
    setTogglingId(null);
    router.refresh();
  }

  async function onConfirmShare(row: PendingShareRow) {
    setConfirmingId(row.id);
    await toggleShareConfirmation(row.id);
    setConfirmingId(null);
    router.refresh();
  }

  return (
    <div>
      <PageHeader title={title} description={`${hint} · ${periodLabel}`} />

      {pendingShares.length ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("pendingSharesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{t("teacherLabel")}</TH>
                  <TH>{tc("student")}</TH>
                  <TH>{tc("date")}</TH>
                  <TH>{t("percentLabel")}</TH>
                  <TH>{tc("amount")}</TH>
                  <TH className="pr-5 text-right">{tc("actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {pendingShares.map((row) => (
                  <TR key={row.id}>
                    <TD className="pl-5 font-medium">{row.teacherName}</TD>
                    <TD className="text-muted-foreground">{row.studentName}</TD>
                    <TD className="text-muted-foreground">{formatDate(row.paidAt, locale)}</TD>
                    <TD className="text-muted-foreground">{row.sharePct}%</TD>
                    <TD className="font-medium text-warning">
                      {formatCurrency(row.shareAmount, locale)}
                    </TD>
                    <TD className="pr-5 text-right">
                      <Button
                        size="sm"
                        onClick={() => onConfirmShare(row)}
                        disabled={confirmingId === row.id}
                      >
                        <ShieldCheck />
                        {t("confirmShare")}
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="px-0 py-0">
          {teachers.length ? (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{tc("name")}</TH>
                  <TH>{t("salaryLabel")}</TH>
                  <TH>{t("confirmedFromPayments")}</TH>
                  <TH>{t("payoutStatus")}</TH>
                  <TH className="pr-5 text-right">{tc("actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {teachers.map((row) => (
                  <TR key={row.id}>
                    <TD className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.name} className="size-8" />
                        <div className="min-w-0">
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.phone}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      {row.salary > 0 ? (
                        formatCurrency(row.salary, locale)
                      ) : (
                        <span className="text-muted-foreground">{t("noSalarySet")}</span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex flex-col">
                        {row.confirmedSharesThisMonth > 0 ? (
                          <span className="font-medium text-success">
                            {formatCurrency(row.confirmedSharesThisMonth, locale)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {row.pendingSharesTotal > 0 ? (
                          <span className="text-xs text-warning">
                            {t("pendingAmount", {
                              amount: formatCurrency(row.pendingSharesTotal, locale),
                            })}
                          </span>
                        ) : null}
                      </div>
                    </TD>
                    <TD>
                      {row.paidAt ? (
                        <Badge variant="success">{t("paidThisMonth")}</Badge>
                      ) : (
                        <Badge variant="warning">{t("pendingThisMonth")}</Badge>
                      )}
                    </TD>
                    <TD className="pr-5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setError(undefined);
                            setEditing(row);
                          }}
                          aria-label={t("setSalary")}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="sm"
                          variant={row.paidAt ? "outline" : "default"}
                          onClick={() => onToggle(row)}
                          disabled={togglingId === row.id || row.salary <= 0}
                        >
                          {row.paidAt ? <X /> : <Check />}
                          {row.paidAt ? t("markUnpaid") : t("markPaid")}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="p-5">
              <EmptyState title={t("noTeachers")} icon={<GraduationCap />} />
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t("setSalaryTitle")}
        description={editing?.name}
      >
        {editing ? (
          <form onSubmit={onSalarySubmit} className="space-y-4">
            <input type="hidden" name="teacherId" value={editing.id} />
            <div className="space-y-1.5">
              <Label htmlFor="salary">{t("salaryLabel")}</Label>
              <Input
                id="salary"
                name="salary"
                type="number"
                min={0}
                step={1000}
                defaultValue={editing.salary || ""}
                required
              />
            </div>
            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {te(error)}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? tc("saving") : tc("save")}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
