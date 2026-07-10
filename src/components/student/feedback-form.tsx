"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { sendFeedback } from "@/app/actions/feedback";

export type TeacherOption = {
  teacherId: string;
  teacherName: string;
  groupId: string;
  groupLabel: string;
};

export type SentFeedback = {
  id: string;
  teacherName: string;
  groupLabel: string | null;
  message: string;
  createdAt: string;
};

export function StudentFeedbackForm({
  teacherOptions,
  history,
  locale,
  title,
  hint,
}: {
  teacherOptions: TeacherOption[];
  history: SentFeedback[];
  locale: string;
  title: string;
  hint: string;
}) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [ok, setOk] = useState(false);
  const [message, setMessage] = useState("");

  // Unique teachers (a student could share the same teacher across classes).
  const uniqueTeachers = useMemo(() => {
    const seen = new Map<string, TeacherOption>();
    for (const o of teacherOptions) if (!seen.has(o.teacherId)) seen.set(o.teacherId, o);
    return [...seen.values()];
  }, [teacherOptions]);

  const [teacherId, setTeacherId] = useState(uniqueTeachers[0]?.teacherId ?? "");
  const selected = teacherOptions.find((o) => o.teacherId === teacherId);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setOk(false);
    const res = await sendFeedback({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setMessage("");
      setOk(true);
      router.refresh();
    } else setError(res?.error);
  }

  return (
    <div>
      <PageHeader title={title} description={hint} />

      {uniqueTeachers.length === 0 ? (
        <EmptyState title={t("noTeachersYet")} icon={<MessageSquare />} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("newFeedback")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <input type="hidden" name="groupId" value={selected?.groupId ?? ""} />
              <div className="space-y-1.5">
                <Label htmlFor="teacherId">{t("teacherLabel")}</Label>
                <Select
                  id="teacherId"
                  name="teacherId"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                >
                  {uniqueTeachers.map((o) => (
                    <option key={o.teacherId} value={o.teacherId}>
                      {o.teacherName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">{t("messageLabel")}</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("messagePlaceholder")}
                  maxLength={1000}
                  required
                />
              </div>
              {error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {te(error)}
                </p>
              ) : null}
              {ok ? (
                <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                  {t("sent")}
                </p>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  <Send />
                  {pending ? tc("saving") : t("send")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState title={t("noHistory")} icon={<MessageSquare />} />
          ) : (
            <div className="space-y-3">
              {history.map((f) => (
                <div key={f.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{f.teacherName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(f.createdAt, locale)}
                      {f.groupLabel ? ` · ${f.groupLabel}` : ""}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{f.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
