"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { addExpense, deleteExpense } from "@/app/actions/finance";

export type ExpenseRow = {
  id: string;
  name: string;
  amount: number;
  date: string;
};

function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ExpensesManager({
  expenses,
  totalThisMonth,
  totalAll,
  locale,
  title,
  hint,
}: {
  expenses: ExpenseRow[];
  totalThisMonth: number;
  totalAll: number;
  locale: string;
  title: string;
  hint: string;
}) {
  const t = useTranslations("ceo");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await addExpense({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setOpen(false);
      router.refresh();
    } else setError(res?.error);
  }

  async function onDelete(row: ExpenseRow) {
    if (!window.confirm(t("deleteExpenseConfirm"))) return;
    await deleteExpense(row.id);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={hint}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            {t("addExpense")}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label={t("expensesThisMonth")}
          value={formatCurrency(totalThisMonth, locale)}
          icon={<Wallet />}
          accent="warning"
        />
        <StatCard
          label={t("expensesAllTime")}
          value={formatCurrency(totalAll, locale)}
          icon={<Receipt />}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="px-0 py-0">
          {expenses.length ? (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{tc("date")}</TH>
                  <TH>{t("expenseName")}</TH>
                  <TH className="text-right">{tc("amount")}</TH>
                  <TH className="pr-5 text-right">{tc("actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {expenses.map((x) => (
                  <TR key={x.id}>
                    <TD className="pl-5 text-muted-foreground">{formatDate(x.date, locale)}</TD>
                    <TD className="font-medium">{x.name}</TD>
                    <TD className="text-right">{formatCurrency(x.amount, locale)}</TD>
                    <TD className="pr-5">
                      <div className="flex justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(x)}
                          aria-label={tc("delete")}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="p-5">
              <EmptyState title={t("noExpenses")} icon={<Receipt />} />
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t("addExpenseTitle")}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("expenseName")}</Label>
            <Input id="name" name="name" placeholder={t("expensePlaceholder")} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">{tc("amount")}</Label>
              <Input id="amount" name="amount" type="number" min={0} step={1000} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">{tc("date")}</Label>
              <Input id="date" name="date" type="date" defaultValue={todayInput()} required />
            </div>
          </div>
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {te(error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
