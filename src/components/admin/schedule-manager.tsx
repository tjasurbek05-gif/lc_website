"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { WEEKDAY_KEYS, WEEKDAYS } from "@/lib/constants";
import { deleteRoom, saveRoom } from "@/app/actions/schedule";

type Slot = { label: string; time: string };
type GridRow = { id: string; name: string; days: Slot[][] };
type RoomRow = { id: string; name: string; capacity: number | null };

export function ScheduleManager({
  rooms,
  teacherRows,
  roomRows,
}: {
  rooms: RoomRow[];
  teacherRows: GridRow[];
  roomRows: GridRow[];
}) {
  const t = useTranslations("schedule");
  const tc = useTranslations("common");
  const tw = useTranslations("weekdays");
  const te = useTranslations("errors");
  const router = useRouter();

  const [view, setView] = useState<"teachers" | "rooms">("teachers");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await saveRoom({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setOpen(false);
      router.refresh();
    } else setError(res?.error);
  }
  function openModal(r: RoomRow | null) {
    setEditing(r);
    setError(undefined);
    setOpen(true);
  }
  async function onDelete(r: RoomRow) {
    if (!window.confirm(t("deleteRoomConfirm"))) return;
    await deleteRoom(r.id);
    router.refresh();
  }

  const rows = view === "teachers" ? teacherRows : roomRows;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("adminHint")}</p>
        </div>
        <Button onClick={() => openModal(null)}>
          <Plus />
          {t("addRoom")}
        </Button>
      </div>

      {/* Rooms */}
      <Card className="mb-6">
        <CardHeader className="flex-row items-center gap-2">
          <DoorOpen className="size-5 text-primary" />
          <CardTitle>{t("rooms")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {rooms.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t("noRooms")} icon={<DoorOpen />} />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">{tc("name")}</TH>
                  <TH>{t("capacity")}</TH>
                  <TH className="pr-5 text-right">{tc("actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {rooms.map((r) => (
                  <TR key={r.id}>
                    <TD className="pl-5 font-medium">{r.name}</TD>
                    <TD className="text-muted-foreground">{r.capacity ?? "—"}</TD>
                    <TD className="pr-5">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openModal(r)}
                          aria-label={tc("edit")}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDelete(r)}
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

      {/* Weekly availability grid */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>{t("availability")}</CardTitle>
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("teachers")}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                view === "teachers" ? "bg-primary text-white" : "text-muted-foreground",
              )}
            >
              {t("teachers")}
            </button>
            <button
              type="button"
              onClick={() => setView("rooms")}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                view === "rooms" ? "bg-primary text-white" : "text-muted-foreground",
              )}
            >
              {t("rooms")}
            </button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState title={tc("noData")} />
          ) : (
            <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="w-32 pb-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {view === "teachers" ? t("teachers") : t("rooms")}
                  </th>
                  {WEEKDAYS.map((wd) => (
                    <th
                      key={wd}
                      className="pb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {tw(WEEKDAY_KEYS[wd])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="pr-2 align-top font-medium">{row.name}</td>
                    {row.days.map((slots, i) => (
                      <td
                        key={i}
                        className="min-w-[92px] rounded-lg bg-muted/40 p-1.5 align-top"
                      >
                        {slots.length === 0 ? (
                          <span className="block text-center text-xs text-muted-foreground/60">
                            {t("free")}
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {slots.map((s, j) => (
                              <div
                                key={j}
                                className="rounded-md bg-primary/10 px-1.5 py-1 text-[11px] leading-tight text-primary"
                              >
                                <div className="font-semibold">{s.time}</div>
                                <div className="truncate opacity-80">{s.label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Room modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("editRoom") : t("addRoom")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="room-name">{tc("name")}</Label>
            <Input
              id="room-name"
              name="name"
              defaultValue={editing?.name ?? ""}
              placeholder={t("roomNamePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-capacity">
              {t("capacity")}{" "}
              <span className="font-normal text-muted-foreground">({tc("optional")})</span>
            </Label>
            <Input
              id="room-capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={editing?.capacity ?? ""}
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
