"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ALL_DAY_PATTERNS } from "@/lib/constants";
import {
  deleteGroup,
  deleteSubject,
  enrollStudent,
  saveGroup,
  saveSubject,
  unenrollStudent,
} from "@/app/actions/admin";
import { deleteSchedule, saveSchedule } from "@/app/actions/schedule";

const MAX_SUBJECTS = 2;

type Named = { id: string; name: string };
export type StudentLite = { id: string; name: string; subjectIds: string[] };
export type ScheduleLite = {
  id: string;
  pattern: string;
  startTime: string;
  durationMin: number;
  room: Named | null;
};
export type GroupData = {
  id: string;
  name: string;
  teacher: Named | null;
  students: Named[];
  schedules: ScheduleLite[];
};
export type SubjectData = {
  id: string;
  name: string;
  description: string | null;
  groups: GroupData[];
};

export function SubjectsHub({
  subjects,
  teachers,
  students,
  rooms,
  initialNew,
}: {
  subjects: SubjectData[];
  teachers: Named[];
  students: StudentLite[];
  rooms: Named[];
  initialNew?: boolean;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const ts = useTranslations("schedule");
  const te = useTranslations("errors");
  const patternLabel = (p: string) => ts(p === "ODD" ? "patternOdd" : "patternEven");
  const router = useRouter();

  // Subject create/edit modal. Opens on mount when arriving from the dashboard
  // quick action (/admin/subjects?new=1).
  const [subjectOpen, setSubjectOpen] = useState(Boolean(initialNew));
  const [editingSubject, setEditingSubject] = useState<SubjectData | null>(null);

  // Group create/edit modal
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupSubjectId, setGroupSubjectId] = useState<string>("");
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);

  // Manage-students modal — track ids so we always read live data from props.
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);
  const [manageSubjectId, setManageSubjectId] = useState<string>("");
  const [search, setSearch] = useState("");

  // Timetable (schedule) modal for a class.
  const [scheduleGroupId, setScheduleGroupId] = useState<string | null>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  /* --------------------------- Subjects --------------------------- */
  function openSubject(s: SubjectData | null) {
    setEditingSubject(s);
    setError(undefined);
    setSubjectOpen(true);
  }
  async function onSubjectSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await saveSubject({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setSubjectOpen(false);
      router.refresh();
    } else setError(res?.error);
  }
  async function onSubjectDelete(s: SubjectData) {
    if (!window.confirm(t("deleteSubjectConfirm"))) return;
    await deleteSubject(s.id);
    router.refresh();
  }

  /* ---------------------------- Groups ---------------------------- */
  function openGroup(subjectId: string, g: GroupData | null) {
    setGroupSubjectId(subjectId);
    setEditingGroup(g);
    setError(undefined);
    setGroupOpen(true);
  }
  async function onGroupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await saveGroup({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setGroupOpen(false);
      router.refresh();
    } else setError(res?.error);
  }
  async function onGroupDelete(g: GroupData) {
    if (!window.confirm(t("deleteGroupConfirm"))) return;
    await deleteGroup(g.id);
    router.refresh();
  }

  /* -------------------------- Enrollment -------------------------- */
  function openManage(subjectId: string, groupId: string) {
    setManageSubjectId(subjectId);
    setManageGroupId(groupId);
    setSearch("");
    setError(undefined);
  }
  async function onToggleStudent(
    enrolled: boolean,
    groupId: string,
    studentId: string,
  ) {
    setError(undefined);
    const res = enrolled
      ? await unenrollStudent(groupId, studentId)
      : await enrollStudent(groupId, studentId);
    if (res?.ok) router.refresh();
    else setError(res?.error);
  }

  /* --------------------------- Timetable -------------------------- */
  async function onScheduleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const form = e.currentTarget;
    const res = await saveSchedule({}, new FormData(form));
    setPending(false);
    if (res?.ok) {
      form.reset();
      router.refresh();
    } else setError(res?.error);
  }
  async function onScheduleDelete(id: string) {
    setError(undefined);
    await deleteSchedule(id);
    router.refresh();
  }

  // The group currently being managed, read fresh from props each render.
  const manageGroup = useMemo<GroupData | null>(() => {
    if (!manageGroupId) return null;
    for (const s of subjects) {
      const g = s.groups.find((gr) => gr.id === manageGroupId);
      if (g) return g;
    }
    return null;
  }, [manageGroupId, subjects]);

  const scheduleGroup = useMemo<GroupData | null>(() => {
    if (!scheduleGroupId) return null;
    for (const s of subjects) {
      const g = s.groups.find((gr) => gr.id === scheduleGroupId);
      if (g) return g;
    }
    return null;
  }, [scheduleGroupId, subjects]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;
  }, [search, students]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("subjectsTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subjectsHint")}</p>
        </div>
        <Button onClick={() => openSubject(null)}>
          <Plus />
          {t("addSubject")}
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState title={t("noSubjects")} icon={<BookOpen />} />
      ) : (
        <div className="space-y-5">
          {subjects.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              {/* Subject header */}
              <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white [&_svg]:size-5">
                      <BookOpen />
                    </span>
                    <h2 className="truncate text-lg font-semibold">{s.name}</h2>
                  </div>
                  {s.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => openGroup(s.id, null)}>
                    <Plus />
                    {t("addGroup")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openSubject(s)}
                    aria-label={tc("edit")}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onSubjectDelete(s)}
                    aria-label={tc("delete")}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              {/* Groups (classes) */}
              <div className="p-5">
                {s.groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noGroups")}</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {s.groups.map((g) => (
                      <div
                        key={g.id}
                        className="rounded-xl border border-border bg-background p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{g.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="size-3.5" />
                              {g.teacher ? g.teacher.name : t("noTeacher")}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openGroup(s.id, g)}
                              aria-label={tc("edit")}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onGroupDelete(g)}
                              aria-label={tc("delete")}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Badge variant="primary">
                            <Users className="mr-1 size-3" />
                            {t("membersCount", { count: g.students.length })}
                          </Badge>
                          {g.students.slice(0, 4).map((st) => (
                            <Badge key={st.id} variant="outline">
                              {st.name}
                            </Badge>
                          ))}
                          {g.students.length > 4 ? (
                            <Badge variant="outline">+{g.students.length - 4}</Badge>
                          ) : null}
                        </div>

                        {g.schedules.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {g.schedules.map((sc) => (
                              <span
                                key={sc.id}
                                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                              >
                                <CalendarClock className="size-3" />
                                {patternLabel(sc.pattern)} · {sc.startTime}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setError(undefined);
                              setScheduleGroupId(g.id);
                            }}
                          >
                            <CalendarClock />
                            {ts("timetable")}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openManage(s.id, g.id)}
                          >
                            <UserPlus />
                            {t("manageStudents")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Subject modal */}
      <Modal
        open={subjectOpen}
        onClose={() => setSubjectOpen(false)}
        title={editingSubject ? tc("edit") : t("addSubject")}
      >
        <form onSubmit={onSubjectSubmit} className="space-y-4">
          {editingSubject ? (
            <input type="hidden" name="id" value={editingSubject.id} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="subject-name">{tc("name")}</Label>
            <Input
              id="subject-name"
              name="name"
              defaultValue={editingSubject?.name ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject-description">
              {tc("comment")}{" "}
              <span className="font-normal text-muted-foreground">({tc("optional")})</span>
            </Label>
            <Input
              id="subject-description"
              name="description"
              defaultValue={editingSubject?.description ?? ""}
            />
          </div>
          {error ? <FormError text={te(error)} /> : null}
          <ModalActions
            pending={pending}
            cancel={tc("cancel")}
            save={tc("save")}
            saving={tc("saving")}
            onCancel={() => setSubjectOpen(false)}
          />
        </form>
      </Modal>

      {/* Group modal */}
      <Modal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title={editingGroup ? t("editGroup") : t("newGroup")}
      >
        <form onSubmit={onGroupSubmit} className="space-y-4">
          <input type="hidden" name="subjectId" value={groupSubjectId} />
          {editingGroup ? <input type="hidden" name="id" value={editingGroup.id} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{t("groupName")}</Label>
            <Input
              id="group-name"
              name="name"
              defaultValue={editingGroup?.name ?? ""}
              placeholder={t("groupNamePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-teacher">{tr("TEACHER")}</Label>
            <Select
              id="group-teacher"
              name="teacherId"
              defaultValue={editingGroup?.teacher?.id ?? ""}
            >
              <option value="">{t("noTeacher")}</option>
              {teachers.map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.name}
                </option>
              ))}
            </Select>
          </div>
          {error ? <FormError text={te(error)} /> : null}
          <ModalActions
            pending={pending}
            cancel={tc("cancel")}
            save={tc("save")}
            saving={tc("saving")}
            onCancel={() => setGroupOpen(false)}
          />
        </form>
      </Modal>

      {/* Manage students modal */}
      <Modal
        open={manageGroup !== null}
        onClose={() => setManageGroupId(null)}
        title={t("manageStudents")}
        description={manageGroup?.name}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchStudents")}
              className="pl-9"
            />
          </div>

          {error ? <FormError text={te(error)} /> : null}

          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {tc("noData")}
              </p>
            ) : (
              filteredStudents.map((st) => {
                const enrolled =
                  manageGroup?.students.some((x) => x.id === st.id) ?? false;
                const inThisSubject = st.subjectIds.includes(manageSubjectId);
                // Blocked when the student already studies the max number of
                // OTHER subjects and isn't already in this one.
                const atLimit =
                  !inThisSubject && st.subjectIds.length >= MAX_SUBJECTS;
                const disabled = !enrolled && atLimit;
                return (
                  <button
                    key={st.id}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      manageGroup &&
                      onToggleStudent(enrolled, manageGroup.id, st.id)
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      enrolled
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <span className="font-medium">{st.name}</span>
                    {enrolled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        {t("enrolled")}
                        <X className="size-3.5" />
                      </span>
                    ) : disabled ? (
                      <span className="text-xs text-muted-foreground">
                        {t("subjectLimitShort")}
                      </span>
                    ) : (
                      <Plus className="size-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="outline" onClick={() => setManageGroupId(null)}>
              {tc("close")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Class timetable modal */}
      <Modal
        open={scheduleGroup !== null}
        onClose={() => setScheduleGroupId(null)}
        title={ts("timetable")}
        description={scheduleGroup?.name}
      >
        <div className="space-y-4">
          {/* Existing timetable entries */}
          {scheduleGroup && scheduleGroup.schedules.length > 0 ? (
            <div className="space-y-1.5">
              {scheduleGroup.schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">
                    {patternLabel(sc.pattern)} · {sc.startTime} · {sc.durationMin}
                    {ts("minShort")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {sc.room ? sc.room.name : ts("noRoom")}
                    </span>
                    <button
                      type="button"
                      onClick={() => onScheduleDelete(sc.id)}
                      aria-label={tc("delete")}
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{ts("noTimetable")}</p>
          )}

          {/* Add a timetable entry */}
          {scheduleGroup ? (
            <form
              onSubmit={onScheduleSubmit}
              className="space-y-3 rounded-lg border border-dashed border-border p-3"
            >
              <input type="hidden" name="groupId" value={scheduleGroup.id} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sc-pattern">{ts("days")}</Label>
                  <Select id="sc-pattern" name="pattern" defaultValue="ODD">
                    {ALL_DAY_PATTERNS.map((p) => (
                      <option key={p} value={p}>
                        {patternLabel(p)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-start">{ts("startTime")}</Label>
                  <Input id="sc-start" name="startTime" type="time" defaultValue="15:00" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-duration">{ts("duration")}</Label>
                  <Input
                    id="sc-duration"
                    name="durationMin"
                    type="number"
                    min={15}
                    step={15}
                    defaultValue={90}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sc-room">{ts("room")}</Label>
                  <Select id="sc-room" name="roomId" defaultValue="">
                    <option value="">{ts("noRoom")}</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {error ? <FormError text={te(error)} /> : null}
              <Button type="submit" size="sm" className="w-full" disabled={pending}>
                <Plus />
                {pending ? tc("saving") : ts("addTimetableEntry")}
              </Button>
            </form>
          ) : null}

          <p className="text-xs text-muted-foreground">{ts("generateHint")}</p>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setScheduleGroupId(null)}>
              {tc("close")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function FormError({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {text}
    </p>
  );
}

function ModalActions({
  pending,
  cancel,
  save,
  saving,
  onCancel,
}: {
  pending: boolean;
  cancel: string;
  save: string;
  saving: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button type="button" variant="outline" onClick={onCancel}>
        {cancel}
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? saving : save}
      </Button>
    </div>
  );
}
