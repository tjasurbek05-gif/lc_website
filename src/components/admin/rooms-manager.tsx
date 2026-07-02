"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock, DoorOpen, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WEEKDAY_KEYS, WEEKDAYS } from "@/lib/constants";
import { assignRoom, deleteAssignment, deleteRoom, saveRoom } from "@/app/actions/rooms";

type Named = { id: string; name: string };

export type RoomAssignmentLite = {
  id: string;
  teacherId: string;
  teacherName: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

export type RoomCard = {
  id: string;
  name: string;
  capacity: number | null;
  assignments: RoomAssignmentLite[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function RoomsManager({
  rooms,
  teachers,
}: {
  rooms: RoomCard[];
  teachers: Named[];
}) {
  const t = useTranslations("rooms");
  const tc = useTranslations("common");
  const tw = useTranslations("weekdays");
  const te = useTranslations("errors");
  const router = useRouter();

  // Room create/edit modal.
  const [roomOpen, setRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomCard | null>(null);
  const [roomPending, setRoomPending] = useState(false);
  const [roomError, setRoomError] = useState<string | undefined>();

  // Assign modal.
  const [assignRoomId, setAssignRoomId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [sh, setSh] = useState("09");
  const [sm, setSm] = useState("00");
  const [eh, setEh] = useState("10");
  const [em, setEm] = useState("30");
  const [assignPending, setAssignPending] = useState(false);
  const [assignError, setAssignError] = useState<string | undefined>();

  function openRoomCreate() {
    setEditingRoom(null);
    setRoomError(undefined);
    setRoomOpen(true);
  }
  function openRoomEdit(room: RoomCard) {
    setEditingRoom(room);
    setRoomError(undefined);
    setRoomOpen(true);
  }

  async function onRoomSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRoomPending(true);
    setRoomError(undefined);
    const res = await saveRoom({}, new FormData(e.currentTarget));
    setRoomPending(false);
    if (res?.ok) {
      setRoomOpen(false);
      router.refresh();
    } else {
      setRoomError(res?.error ?? "invalid");
    }
  }

  async function onDeleteRoom(id: string) {
    if (!confirm(t("deleteRoomConfirm"))) return;
    await deleteRoom(id);
    router.refresh();
  }

  function openAssign(roomId: string) {
    setAssignRoomId(roomId);
    setTeacherName("");
    setDays([]);
    setSh("09");
    setSm("00");
    setEh("10");
    setEm("30");
    setAssignError(undefined);
  }

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function onAssignSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignRoomId) return;
    const teacher = teachers.find(
      (x) => x.name.toLowerCase() === teacherName.trim().toLowerCase(),
    );
    if (!teacher) {
      setAssignError("teacherNotFound");
      return;
    }
    if (days.length === 0) {
      setAssignError("pickDay");
      return;
    }
    setAssignPending(true);
    setAssignError(undefined);
    const res = await assignRoom({
      roomId: assignRoomId,
      teacherId: teacher.id,
      weekdays: days,
      startTime: `${pad2(Number(sh))}:${pad2(Number(sm))}`,
      endTime: `${pad2(Number(eh))}:${pad2(Number(em))}`,
    });
    setAssignPending(false);
    if (res?.ok) {
      setAssignRoomId(null);
      router.refresh();
    } else {
      setAssignError(res?.error ?? "invalid");
    }
  }

  async function onDeleteAssignment(id: string) {
    await deleteAssignment(id);
    router.refresh();
  }

  const numField =
    "h-10 w-16 rounded-lg border border-input bg-card px-2 text-center text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>
        </div>
        <Button onClick={openRoomCreate}>
          <Plus /> {t("addRoom")}
        </Button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState title={t("noRooms")} icon={<DoorOpen />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="flex h-full flex-col p-5 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-brand-gradient text-white [&_svg]:size-5">
                      <DoorOpen />
                    </span>
                    <div>
                      <p className="font-semibold">{room.name}</p>
                      {room.capacity != null ? (
                        <p className="text-xs text-muted-foreground">
                          {t("capacity")}: {room.capacity}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openRoomEdit(room)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={tc("edit")}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRoom(room.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex-1 space-y-1.5">
                  {room.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noAssignments")}</p>
                  ) : (
                    room.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-sm"
                      >
                        <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{tw(WEEKDAY_KEYS[a.weekday])}</span>
                        <span className="text-muted-foreground">
                          {a.startTime}–{a.endTime}
                        </span>
                        <span className="ml-auto truncate text-muted-foreground">
                          {a.teacherName}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteAssignment(a.id)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={tc("delete")}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => openAssign(room.id)}
                >
                  <UserPlus /> {t("assign")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Room create/edit modal */}
      <Modal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        title={editingRoom ? t("editRoom") : t("addRoom")}
      >
        <form onSubmit={onRoomSubmit} className="space-y-4">
          {editingRoom ? (
            <input type="hidden" name="id" value={editingRoom.id} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="room-name">{tc("name")}</Label>
            <Input
              id="room-name"
              name="name"
              required
              defaultValue={editingRoom?.name ?? ""}
              placeholder={t("roomNamePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-capacity">
              {t("capacity")}{" "}
              <span className="text-muted-foreground">({tc("optional")})</span>
            </Label>
            <Input
              id="room-capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={editingRoom?.capacity ?? ""}
            />
          </div>
          {roomError ? (
            <p className="text-sm text-destructive">{te(roomError)}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setRoomOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={roomPending}>
              {roomPending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign teacher modal */}
      <Modal
        open={assignRoomId !== null}
        onClose={() => setAssignRoomId(null)}
        title={t("assignTitle")}
        description={t("assignHint")}
      >
        <form onSubmit={onAssignSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-teacher">{t("teacher")}</Label>
            <Input
              id="assign-teacher"
              list="teacher-options"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder={t("teacherPlaceholder")}
              autoComplete="off"
            />
            <datalist id="teacher-options">
              {teachers.map((tt) => (
                <option key={tt.id} value={tt.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label>{t("weekdays")}</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`h-9 min-w-11 rounded-lg border px-2 text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {tw(WEEKDAY_KEYS[d])}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("startTime")}</Label>
              <div className="flex items-center gap-1.5">
                <input
                  className={numField}
                  type="number"
                  min={0}
                  max={23}
                  value={sh}
                  onChange={(e) => setSh(e.target.value)}
                  aria-label={t("hour")}
                />
                <span className="text-muted-foreground">:</span>
                <input
                  className={numField}
                  type="number"
                  min={0}
                  max={59}
                  value={sm}
                  onChange={(e) => setSm(e.target.value)}
                  aria-label={t("minute")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("endTime")}</Label>
              <div className="flex items-center gap-1.5">
                <input
                  className={numField}
                  type="number"
                  min={0}
                  max={23}
                  value={eh}
                  onChange={(e) => setEh(e.target.value)}
                  aria-label={t("hour")}
                />
                <span className="text-muted-foreground">:</span>
                <input
                  className={numField}
                  type="number"
                  min={0}
                  max={59}
                  value={em}
                  onChange={(e) => setEm(e.target.value)}
                  aria-label={t("minute")}
                />
              </div>
            </div>
          </div>

          {assignError ? (
            <p className="text-sm text-destructive">{te(assignError)}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignRoomId(null)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={assignPending}>
              {assignPending ? tc("saving") : t("assign")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
