"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { deleteGroup, saveGroup } from "@/app/actions/admin";

export type GroupRow = { id: string; name: string; count: number };

export function GroupsManager({ groups }: { groups: GroupRow[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await saveGroup({}, new FormData(e.currentTarget));
    setPending(false);
    if (result?.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result?.error);
    }
  }

  function openModal(g: GroupRow | null) {
    setEditing(g);
    setError(undefined);
    setOpen(true);
  }

  async function onDelete(g: GroupRow) {
    if (!window.confirm(tc("confirmDelete"))) return;
    await deleteGroup(g.id);
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("groupsTitle")}</h1>
        <Button onClick={() => openModal(null)}>
          <Plus />
          {t("addGroup")}
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH className="pl-5">{tc("name")}</TH>
                <TH>{t("totalStudents")}</TH>
                <TH className="pr-5 text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {groups.map((g) => (
                <TR key={g.id}>
                  <TD className="pl-5 font-medium">{g.name}</TD>
                  <TD>
                    <Badge variant="primary">
                      <Users className="mr-1 size-3" />
                      {t("membersCount", { count: g.count })}
                    </Badge>
                  </TD>
                  <TD className="pr-5">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openModal(g)}
                        aria-label={tc("edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(g)}
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
        title={editing ? tc("edit") : t("addGroup")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="name">{tc("name")}</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
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
