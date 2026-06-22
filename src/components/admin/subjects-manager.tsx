"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { deleteSubject, saveSubject } from "@/app/actions/admin";

export type SubjectRow = {
  id: string;
  name: string;
  description: string | null;
};

export function SubjectsManager({ subjects }: { subjects: SubjectRow[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await saveSubject({}, new FormData(e.currentTarget));
    setPending(false);
    if (result?.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result?.error);
    }
  }

  function openModal(s: SubjectRow | null) {
    setEditing(s);
    setError(undefined);
    setOpen(true);
  }

  async function onDelete(s: SubjectRow) {
    if (!window.confirm(tc("confirmDelete"))) return;
    await deleteSubject(s.id);
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("subjectsTitle")}</h1>
        <Button onClick={() => openModal(null)}>
          <Plus />
          {t("addSubject")}
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH className="pl-5">{tc("name")}</TH>
                <TH>{tc("comment")}</TH>
                <TH className="pr-5 text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {subjects.map((s) => (
                <TR key={s.id}>
                  <TD className="pl-5 font-medium">{s.name}</TD>
                  <TD className="max-w-md truncate text-muted-foreground">
                    {s.description || "—"}
                  </TD>
                  <TD className="pr-5">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openModal(s)}
                        aria-label={tc("edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(s)}
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
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? tc("edit") : t("addSubject")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="name">{tc("name")}</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">
              {tc("comment")}{" "}
              <span className="font-normal text-muted-foreground">
                ({tc("optional")})
              </span>
            </Label>
            <Input
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
            />
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
    </>
  );
}
