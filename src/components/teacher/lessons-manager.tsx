"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarPlus, ClipboardCheck, Coins, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { COIN_LIMITS, coinLimitFor } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createLesson, type LessonEntryInput } from "@/app/actions/lessons";
import {
  PreviousLessonContainer,
  type PreviousLessonView,
} from "@/components/lessons/previous-lesson";

export type GroupOption = {
  id: string;
  label: string;
  students: { id: string; name: string }[];
  takenDates: string[];
};

type Row = { studentId: string; present: boolean; reason: string; coins: number };

export function LessonsManager({
  groups,
  lessons,
}: {
  groups: GroupOption[];
  lessons: PreviousLessonView[];
}) {
  const t = useTranslations("lessons");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"TYPICAL" | "EXAM">("TYPICAL");
  const [date, setDate] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId],
  );
  const limit = coinLimitFor(type);

  function resetForm() {
    setGroupId("");
    setTitle("");
    setType("TYPICAL");
    setDate("");
    setRows({});
    setError(undefined);
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function onSelectGroup(id: string) {
    setGroupId(id);
    const g = groups.find((x) => x.id === id);
    const next: Record<string, Row> = {};
    for (const s of g?.students ?? []) {
      next[s.id] = { studentId: s.id, present: true, reason: "", coins: 0 };
    }
    setRows(next);
  }

  function setRow(studentId: string, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  }

  function clampCoins(v: number) {
    return Math.max(-limit, Math.min(limit, v));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedGroup) {
      setError("invalid");
      return;
    }
    if (selectedGroup.takenDates.includes(date)) {
      setError("dateTaken");
      return;
    }
    const entries: LessonEntryInput[] = selectedGroup.students.map((s) => {
      const r = rows[s.id];
      return {
        studentId: s.id,
        status: r?.present ? "PRESENT" : "ABSENT",
        reason: r?.present ? null : r?.reason || null,
        coins: r?.present ? clampCoins(r?.coins ?? 0) : 0,
      };
    });

    setPending(true);
    setError(undefined);
    const res = await createLesson({ groupId, title, type, date }, entries);
    setPending(false);
    if (res?.ok) {
      setOpen(false);
      resetForm();
      router.refresh();
    } else {
      setError(res?.error ?? "invalid");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>
        </div>
        <Button onClick={openModal} disabled={groups.length === 0}>
          <CalendarPlus /> {t("addLesson")}
        </Button>
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          title={groups.length === 0 ? t("noClasses") : t("noLessons")}
          description={groups.length === 0 ? undefined : t("noLessonsHint")}
          icon={<ClipboardCheck />}
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("previousLessons")}
          </h2>
          {lessons.map((l, i) => (
            <PreviousLessonContainer key={l.id} lesson={l} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("addLesson")}
        description={t("addLessonHint")}
        className="max-w-2xl"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="l-group">{tc("group")}</Label>
              <Select
                id="l-group"
                required
                value={groupId}
                onChange={(e) => onSelectGroup(e.target.value)}
              >
                <option value="" disabled>
                  {t("selectGroup")}
                </option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-name">{t("lessonName")}</Label>
              <Input
                id="l-name"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("lessonNamePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-type">{t("lessonType")}</Label>
              <Select
                id="l-type"
                value={type}
                onChange={(e) => setType(e.target.value as "TYPICAL" | "EXAM")}
              >
                <option value="TYPICAL">
                  {t("typeTypical")} (±{COIN_LIMITS.TYPICAL})
                </option>
                <option value="EXAM">
                  {t("typeExam")} (±{COIN_LIMITS.EXAM})
                </option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-date">{t("lessonDate")}</Label>
              <Input
                id="l-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {selectedGroup && date && selectedGroup.takenDates.includes(date) ? (
                <p className="text-xs text-destructive">{t("dateTakenHint")}</p>
              ) : null}
            </div>
          </div>

          {selectedGroup ? (
            <div className="rounded-xl border border-border">
              <div className="border-b border-border px-4 py-2.5 text-sm font-medium">
                {t("typicalTable")}{" "}
                <span className="text-muted-foreground">
                  ({t("coinRangeHint", { limit })})
                </span>
              </div>
              {selectedGroup.students.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  {t("noStudents")}
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {selectedGroup.students.map((s) => {
                    const r = rows[s.id];
                    const present = r?.present ?? true;
                    return (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 last:border-0"
                      >
                        <span className="w-32 shrink-0 truncate text-sm font-medium">
                          {s.name}
                        </span>
                        {/* Present / absent toggle */}
                        <div className="flex overflow-hidden rounded-lg border border-border">
                          <button
                            type="button"
                            onClick={() => setRow(s.id, { present: true })}
                            className={cn(
                              "px-2.5 py-1 text-xs font-medium",
                              present
                                ? "bg-success text-success-foreground"
                                : "bg-card text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {t("present")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRow(s.id, { present: false })}
                            className={cn(
                              "px-2.5 py-1 text-xs font-medium",
                              !present
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-card text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {t("absent")}
                          </button>
                        </div>

                        {present ? (
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setRow(s.id, { coins: clampCoins((r?.coins ?? 0) - 1) })
                              }
                              className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                              aria-label="-1"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span
                              className={cn(
                                "inline-flex w-12 items-center justify-center gap-0.5 text-sm font-semibold",
                                (r?.coins ?? 0) > 0 && "text-success",
                                (r?.coins ?? 0) < 0 && "text-destructive",
                              )}
                            >
                              <Coins className="size-3.5" />
                              {(r?.coins ?? 0) > 0 ? `+${r?.coins}` : (r?.coins ?? 0)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRow(s.id, { coins: clampCoins((r?.coins ?? 0) + 1) })
                              }
                              className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                              aria-label="+1"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Input
                            value={r?.reason ?? ""}
                            onChange={(e) => setRow(s.id, { reason: e.target.value })}
                            placeholder={t("reasonPlaceholder")}
                            className="ml-auto h-8 w-48"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {t("selectGroupFirst")}
            </p>
          )}

          {error ? <p className="text-sm text-destructive">{te(error)}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending || !selectedGroup}>
              {pending ? tc("saving") : t("createLesson")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
