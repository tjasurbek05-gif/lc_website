"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreBadge } from "@/components/score-badge";
import { GRADE_TYPES } from "@/lib/constants";
import { deleteGrade, saveGrade } from "@/app/actions/grades";

export type StudentRow = {
  id: string;
  name: string;
  average: number | null;
  count: number;
};
export type RecentGrade = {
  id: string;
  studentId: string;
  studentName: string;
  value: number;
  maxValue: number;
  type: string;
  dateLabel: string;
  dateISO: string;
  comment: string | null;
};

export function ClassGradebook({
  subjectId,
  students,
  recent,
}: {
  subjectId: string;
  students: StudentRow[];
  recent: RecentGrade[];
}) {
  const t = useTranslations("teacher");
  const tc = useTranslations("common");
  const tg = useTranslations("gradeTypes");
  const te = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecentGrade | null>(null);
  const [studentId, setStudentId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await saveGrade({}, new FormData(e.currentTarget));
    setPending(false);
    if (result?.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result?.error);
    }
  }

  function openAdd(preStudent?: string) {
    setEditing(null);
    setError(undefined);
    setStudentId(preStudent ?? students[0]?.id ?? "");
    setOpen(true);
  }
  function openEdit(g: RecentGrade) {
    setEditing(g);
    setError(undefined);
    setStudentId(g.studentId);
    setOpen(true);
  }
  async function onDelete(id: string) {
    if (!window.confirm(tc("confirmDelete"))) return;
    await deleteGrade(id);
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Roster */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>{t("rosterTitle")}</CardTitle>
            <Button size="sm" onClick={() => openAdd()} disabled={students.length === 0}>
              <Plus />
              {t("addGrade")}
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {students.length === 0 ? (
              <div className="p-5">
                <EmptyState title={tc("noData")} />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH className="pl-5">{t("studentColumn")}</TH>
                    <TH className="text-center">{tc("grade")}</TH>
                    <TH className="text-right">{tc("average")}</TH>
                    <TH className="pr-5 text-right">{tc("actions")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {students.map((s) => (
                    <TR key={s.id}>
                      <TD className="pl-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} className="size-8" />
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </TD>
                      <TD className="text-center text-muted-foreground">{s.count}</TD>
                      <TD className="text-right">
                        {s.average == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <ScoreBadge percent={s.average} showLetter={false} />
                        )}
                      </TD>
                      <TD className="pr-5 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openAdd(s.id)}>
                          <Plus />
                          {t("addGrade")}
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent marks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("marksTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recent.length === 0 ? (
              <div className="p-5">
                <EmptyState title={tc("noData")} />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH className="pl-5">{t("studentColumn")}</TH>
                    <TH>{tc("grade")}</TH>
                    <TH className="pr-5 text-right">{tc("actions")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {recent.map((g) => (
                    <TR key={g.id}>
                      <TD className="pl-5">
                        <div className="font-medium">{g.studentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {tg(g.type)} · {g.dateLabel}
                        </div>
                      </TD>
                      <TD>
                        <ScoreBadge
                          percent={Math.round((g.value / g.maxValue) * 1000) / 10}
                          showLetter={false}
                        />
                      </TD>
                      <TD className="pr-5">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(g)}
                            aria-label={tc("edit")}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(g.id)}
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
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("editGradeTitle") : t("addGradeTitle")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="subjectId" value={subjectId} />
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-1.5">
            <Label htmlFor="studentId">{t("studentColumn")}</Label>
            {editing ? (
              <>
                <Input value={editing.studentName} disabled />
                <input type="hidden" name="studentId" value={studentId} />
              </>
            ) : (
              <Select
                id="studentId"
                name="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="value">{tc("value")}</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min={0}
                step="0.5"
                defaultValue={editing?.value ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxValue">{tc("maxValue")}</Label>
              <Input
                id="maxValue"
                name="maxValue"
                type="number"
                min={1}
                step="1"
                defaultValue={editing?.maxValue ?? 100}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">{tc("type")}</Label>
              <Select
                id="type"
                name="type"
                defaultValue={editing?.type ?? GRADE_TYPES[0]}
              >
                {GRADE_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {tg(ty)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">{tc("date")}</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={editing?.dateISO ?? today}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment">
              {tc("comment")}{" "}
              <span className="font-normal text-muted-foreground">
                ({tc("optional")})
              </span>
            </Label>
            <Input id="comment" name="comment" defaultValue={editing?.comment ?? ""} />
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
              {pending ? tc("saving") : t("saveGrade")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
