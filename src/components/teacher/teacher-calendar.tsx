"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ALL_LESSON_TYPES, LESSON_TYPES, WEEKDAY_KEYS, WEEKDAYS } from "@/lib/constants";
import {
  deleteLesson,
  markAttendance,
  saveLesson,
  toggleLessonCancelled,
} from "@/app/actions/schedule";

type AttStatus = "PRESENT" | "ABSENT" | null;
export type CalLesson = {
  id: string;
  groupId: string;
  groupLabel: string;
  title: string | null;
  type: string;
  status: string;
  dayIndex: number;
  dateInput: string;
  startInput: string;
  endInput: string;
  roomId: string | null;
  roomName: string | null;
  isPast: boolean;
  marked: boolean;
  total: number;
  present: number;
  absent: number;
  students: { id: string; name: string; status: AttStatus; reason: string | null }[];
};

type Named = { id: string; name: string };

export function TeacherCalendar({
  weekOffset,
  weekLabel,
  weekDays,
  lessons,
  groups,
  rooms,
  lessonStatusCancelled,
}: {
  weekOffset: number;
  weekLabel: string;
  weekDays: { dateLabel: string }[];
  lessons: CalLesson[];
  groups: { id: string; label: string }[];
  rooms: Named[];
  lessonStatusCancelled: string;
}) {
  const t = useTranslations("schedule");
  const tc = useTranslations("common");
  const tw = useTranslations("weekdays");
  const tlt = useTranslations("lessonTypes");
  const te = useTranslations("errors");
  const pathname = usePathname();
  const router = useRouter();

  const [lessonOpen, setLessonOpen] = useState(false);
  const [editing, setEditing] = useState<CalLesson | null>(null);
  const [attLesson, setAttLesson] = useState<CalLesson | null>(null);
  const [att, setAtt] = useState<Record<string, { status: "PRESENT" | "ABSENT"; reason: string }>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const weekHref = (offset: number) => `${pathname}?week=${offset}`;

  function openAdd() {
    setEditing(null);
    setError(undefined);
    setLessonOpen(true);
  }
  function openEdit(l: CalLesson) {
    setEditing(l);
    setError(undefined);
    setLessonOpen(true);
  }
  async function onLessonSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await saveLesson({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setLessonOpen(false);
      router.refresh();
    } else setError(res?.error);
  }
  async function onCancelToggle(l: CalLesson) {
    await toggleLessonCancelled(l.id);
    router.refresh();
  }
  async function onDelete(l: CalLesson) {
    if (!window.confirm(t("deleteLessonConfirm"))) return;
    await deleteLesson(l.id);
    router.refresh();
  }

  function openAttendance(l: CalLesson) {
    setAttLesson(l);
    setError(undefined);
    const init: Record<string, { status: "PRESENT" | "ABSENT"; reason: string }> = {};
    for (const s of l.students) {
      init[s.id] = {
        status: s.status === "ABSENT" ? "ABSENT" : "PRESENT",
        reason: s.reason ?? "",
      };
    }
    setAtt(init);
  }
  async function onAttendanceSave() {
    if (!attLesson) return;
    setPending(true);
    setError(undefined);
    const entries = attLesson.students.map((s) => ({
      studentId: s.id,
      status: att[s.id]?.status ?? "PRESENT",
      reason: att[s.id]?.reason ?? "",
    }));
    const res = await markAttendance(attLesson.id, entries);
    setPending(false);
    if (res?.ok) {
      setAttLesson(null);
      router.refresh();
    } else setError(res?.error);
  }

  const today = new Date();
  const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("myScheduleTitle")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border">
            <Link
              href={weekHref(weekOffset - 1)}
              className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
              aria-label={t("prevWeek")}
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={weekHref(0)}
              className="border-x border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              {t("today")}
            </Link>
            <Link
              href={weekHref(weekOffset + 1)}
              className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
              aria-label={t("nextWeek")}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <Button onClick={openAdd} disabled={groups.length === 0}>
            <Plus />
            {t("addLesson")}
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm font-medium text-muted-foreground">{weekLabel}</p>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1">
        {WEEKDAYS.map((wd, i) => {
          const dayLessons = lessons
            .filter((l) => l.dayIndex === i)
            .sort((a, b) => a.startInput.localeCompare(b.startInput));
          return (
            <Card key={wd} className="p-4">
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="font-semibold">{tw(WEEKDAY_KEYS[wd])}</h2>
                <span className="text-sm text-muted-foreground">
                  {weekDays[i]?.dateLabel}
                </span>
              </div>
              {dayLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground/70">{t("noLessonsDay")}</p>
              ) : (
                <div className="space-y-2">
                  {dayLessons.map((l) => {
                    const cancelled = l.status === lessonStatusCancelled;
                    // Green once attendance is marked; red when a past lesson
                    // still needs marking; neutral for upcoming lessons.
                    const needsMarking = !cancelled && !l.marked && l.isPast;
                    const tone = cancelled
                      ? "opacity-60"
                      : l.marked
                        ? "border-l-4 border-l-success"
                        : needsMarking
                          ? "border-l-4 border-l-destructive"
                          : "";
                    return (
                      <div
                        key={l.id}
                        className={cn("rounded-lg border border-border p-3", tone)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={cn("font-medium", cancelled && "line-through")}>
                                {l.title || l.groupLabel}
                              </p>
                              {l.type !== LESSON_TYPES.LESSON ? (
                                <Badge variant="warning">{tlt(l.type)}</Badge>
                              ) : null}
                            </div>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="size-3.5" />
                                {l.startInput}–{l.endInput}
                              </span>
                              {l.roomName ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="size-3.5" />
                                  {l.roomName}
                                </span>
                              ) : null}
                              {l.title ? <span>{l.groupLabel}</span> : null}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(l)}
                              aria-label={tc("edit")}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onCancelToggle(l)}
                              aria-label={cancelled ? t("restore") : t("cancelLesson")}
                            >
                              {cancelled ? <Check /> : <X />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onDelete(l)}
                              aria-label={tc("delete")}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>

                        {!cancelled ? (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {l.marked ? (
                                <>
                                  <Badge variant="success">
                                    {t("presentCount", { count: l.present })}
                                  </Badge>
                                  {l.absent > 0 ? (
                                    <Badge variant="danger">
                                      {t("absentCount", { count: l.absent })}
                                    </Badge>
                                  ) : null}
                                </>
                              ) : needsMarking ? (
                                <Badge variant="danger">{t("notMarked")}</Badge>
                              ) : (
                                <span className="text-muted-foreground">
                                  {t("upcoming")}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openAttendance(l)}
                              disabled={l.total === 0}
                            >
                              <ClipboardCheck />
                              {t("markAttendance")}
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="danger" className="mt-2">
                            {t("cancelled")}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Lesson add/edit modal */}
      <Modal
        open={lessonOpen}
        onClose={() => setLessonOpen(false)}
        title={editing ? t("editLesson") : t("addLesson")}
      >
        <form onSubmit={onLessonSubmit} className="space-y-4">
          {editing ? (
            <>
              <input type="hidden" name="id" value={editing.id} />
              <input type="hidden" name="groupId" value={editing.groupId} />
              <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                {editing.groupLabel}
              </p>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="l-group">{t("class")}</Label>
              <Select id="l-group" name="groupId" required defaultValue="">
                <option value="" disabled>
                  —
                </option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="l-title">
              {t("lessonTitle")}{" "}
              <span className="font-normal text-muted-foreground">({tc("optional")})</span>
            </Label>
            <Input
              id="l-title"
              name="title"
              defaultValue={editing?.title ?? ""}
              placeholder={t("lessonTitlePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-type">{t("lessonType")}</Label>
            <Select id="l-type" name="type" defaultValue={editing?.type ?? "LESSON"}>
              {ALL_LESSON_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {tlt(ty)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-date">{tc("date")}</Label>
            <Input
              id="l-date"
              name="date"
              type="date"
              defaultValue={editing?.dateInput ?? todayInput}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="l-start">{t("startTime")}</Label>
              <Input
                id="l-start"
                name="startTime"
                type="time"
                defaultValue={editing?.startInput ?? "15:00"}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-end">{t("endTime")}</Label>
              <Input
                id="l-end"
                name="endTime"
                type="time"
                defaultValue={editing?.endInput ?? "16:30"}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-room">{t("room")}</Label>
            <Select id="l-room" name="roomId" defaultValue={editing?.roomId ?? ""}>
              <option value="">{t("noRoom")}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
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
            <Button type="button" variant="outline" onClick={() => setLessonOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attendance modal */}
      <Modal
        open={attLesson !== null}
        onClose={() => setAttLesson(null)}
        title={t("markAttendance")}
        description={attLesson ? attLesson.title || attLesson.groupLabel : undefined}
      >
        {attLesson ? (
          <div className="space-y-3">
            <div className="max-h-[52vh] space-y-2 overflow-y-auto">
              {attLesson.students.map((s) => {
                const cur = att[s.id]?.status ?? "PRESENT";
                return (
                  <div key={s.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{s.name}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setAtt((a) => ({
                              ...a,
                              [s.id]: { status: "PRESENT", reason: a[s.id]?.reason ?? "" },
                            }))
                          }
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-medium",
                            cur === "PRESENT"
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {t("present")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAtt((a) => ({
                              ...a,
                              [s.id]: { status: "ABSENT", reason: a[s.id]?.reason ?? "" },
                            }))
                          }
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-medium",
                            cur === "ABSENT"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {t("absent")}
                        </button>
                      </div>
                    </div>
                    {cur === "ABSENT" ? (
                      <Input
                        value={att[s.id]?.reason ?? ""}
                        onChange={(e) =>
                          setAtt((a) => ({
                            ...a,
                            [s.id]: { status: "ABSENT", reason: e.target.value },
                          }))
                        }
                        placeholder={t("reasonPlaceholder")}
                        className="mt-2 h-9"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {te(error)}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAttLesson(null)}>
                {tc("cancel")}
              </Button>
              <Button onClick={onAttendanceSave} disabled={pending}>
                {pending ? tc("saving") : t("saveAttendance")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
