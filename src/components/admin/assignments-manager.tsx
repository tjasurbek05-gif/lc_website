"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { createAssignment, deleteAssignment } from "@/app/actions/admin";

type Named = { id: string; name: string };
export type AssignmentRow = {
  id: string;
  teacherName: string;
  subjectName: string;
  groupName: string;
};

export function AssignmentsManager({
  assignments,
  teachers,
  subjects,
  groups,
}: {
  assignments: AssignmentRow[];
  teachers: Named[];
  subjects: Named[];
  groups: Named[];
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const te = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await createAssignment({}, new FormData(e.currentTarget));
    setPending(false);
    if (result?.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result?.error);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(tc("confirmDelete"))) return;
    await deleteAssignment(id);
    router.refresh();
  }

  const canAdd = teachers.length > 0 && subjects.length > 0 && groups.length > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{t("assignmentsTitle")}</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setError(undefined);
            setOpen(true);
          }}
          disabled={!canAdd}
        >
          <Plus />
          {t("addAssignment")}
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {assignments.length === 0 ? (
          <div className="p-5">
            <EmptyState title={tc("noData")} />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="pl-5">{tr("TEACHER")}</TH>
                <TH>{tc("subject")}</TH>
                <TH>{tc("group")}</TH>
                <TH className="pr-5 text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {assignments.map((a) => (
                <TR key={a.id}>
                  <TD className="pl-5 font-medium">{a.teacherName}</TD>
                  <TD>
                    <Badge variant="primary">{a.subjectName}</Badge>
                  </TD>
                  <TD className="text-muted-foreground">{a.groupName}</TD>
                  <TD className="pr-5">
                    <div className="flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(a.id)}
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("addAssignment")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="teacherId">{tr("TEACHER")}</Label>
            <Select id="teacherId" name="teacherId" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {teachers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subjectId">{tc("subject")}</Label>
            <Select id="subjectId" name="subjectId" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {subjects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="groupId">{tc("group")}</Label>
            <Select id="groupId" name="groupId" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {groups.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
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
    </Card>
  );
}
