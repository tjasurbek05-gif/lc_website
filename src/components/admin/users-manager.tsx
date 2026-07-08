"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ALL_ROLES, ROLES } from "@/lib/constants";
import { deleteUser, saveUser } from "@/app/actions/admin";

export type UserRow = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

function roleVariant(role: string): "danger" | "primary" | "default" {
  if (role === ROLES.ADMIN) return "danger";
  if (role === ROLES.TEACHER) return "primary";
  return "default";
}

/** Map a dashboard quick-action hint (?new=teacher) to a starting role. */
function roleFromNew(value?: string | null): string {
  const r = (value ?? "").toUpperCase();
  if (r === ROLES.TEACHER) return ROLES.TEACHER;
  if (r === ROLES.ADMIN) return ROLES.ADMIN;
  return ROLES.STUDENT;
}

export function UsersManager({
  users,
  initialNewRole,
}: {
  users: UserRow[];
  initialNewRole?: string | null;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const te = useTranslations("errors");
  const router = useRouter();

  // Open the "add user" modal pre-set to a role when arriving from a dashboard
  // quick action (e.g. /admin/users?new=teacher) — initialised on mount.
  const [open, setOpen] = useState(Boolean(initialNewRole));
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [role, setRole] = useState<string>(() => roleFromNew(initialNewRole));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q),
    );
  }, [users, query]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await saveUser({}, new FormData(e.currentTarget));
    setPending(false);
    if (result?.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result?.error);
    }
  }

  function openAdd() {
    setEditing(null);
    setError(undefined);
    setRole(ROLES.STUDENT);
    setOpen(true);
  }
  function openEdit(u: UserRow) {
    setEditing(u);
    setError(undefined);
    setRole(u.role);
    setOpen(true);
  }
  async function onDelete(u: UserRow) {
    if (!window.confirm(t("deleteUserConfirm"))) return;
    await deleteUser(u.id);
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("usersTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("peopleHint")}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus />
          {t("addUser")}
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tc("searchByNamePhone")}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          {filteredUsers.length === 0 ? (
            <div className="p-5">
              <EmptyState title={tc("noResults")} />
            </div>
          ) : (
          <Table>
            <THead>
              <TR>
                <TH className="pl-5">{tc("name")}</TH>
                <TH>{tc("phone")}</TH>
                <TH>{tc("role")}</TH>
                <TH className="pr-5 text-right">{tc("actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {filteredUsers.map((u) => (
                <TR key={u.id}>
                  <TD className="pl-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} className="size-8" />
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">{u.phone}</TD>
                  <TD>
                    <Badge variant={roleVariant(u.role)}>{tr(u.role)}</Badge>
                  </TD>
                  <TD className="pr-5">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(u)}
                        aria-label={tc("edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(u)}
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("editUser") : t("newUser")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-1.5">
            <Label htmlFor="name">{tc("name")}</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{tc("phone")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder={tc("phonePlaceholder")}
              defaultValue={editing?.phone ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">{tc("role")}</Label>
            <Select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {tr(r)}
                </option>
              ))}
            </Select>
            {role === ROLES.STUDENT ? (
              <p className="text-xs text-muted-foreground">{t("enrollHint")}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{tc("password")}</Label>
            <Input
              id="password"
              name="password"
              type="text"
              autoComplete="new-password"
              placeholder={editing ? "••••••" : ""}
              required={!editing}
            />
            {editing ? (
              <p className="text-xs text-muted-foreground">{t("passwordKeepHint")}</p>
            ) : null}
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
