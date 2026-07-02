"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ChevronDown, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type LessonEntryView = {
  studentId: string;
  name: string;
  status: "PRESENT" | "ABSENT" | null;
  reason: string | null;
  coins: number;
};

export type PreviousLessonView = {
  id: string;
  title: string;
  type: string; // "TYPICAL" | "EXAM"
  dateLabel: string;
  groupLabel: string;
  teacherName?: string;
  entries: LessonEntryView[];
};

/**
 * A "previous lesson container": shows the lesson's date and a button that
 * reveals its read-only "typical table" (name, presence, reason, coins).
 */
export function PreviousLessonContainer({
  lesson,
  defaultOpen = false,
}: {
  lesson: PreviousLessonView;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("lessons");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white [&_svg]:size-5">
          <CalendarDays />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{lesson.title}</p>
            <Badge variant={lesson.type === "EXAM" ? "warning" : "outline"}>
              {t(lesson.type === "EXAM" ? "typeExam" : "typeTypical")}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {lesson.dateLabel} · {lesson.groupLabel}
            {lesson.teacherName ? ` · ${lesson.teacherName}` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-border">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-semibold">
                    {tc("student")}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    {t("presence")}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold">{t("reason")}</th>
                  <th className="px-5 py-2.5 text-right font-semibold">{t("coins")}</th>
                </tr>
              </thead>
              <tbody>
                {lesson.entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-4 text-center text-muted-foreground"
                    >
                      {tc("noData")}
                    </td>
                  </tr>
                ) : (
                  lesson.entries.map((e) => (
                    <tr key={e.studentId} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium">{e.name}</td>
                      <td className="px-4 py-2.5">
                        {e.status === "ABSENT" ? (
                          <Badge variant="danger">{t("absent")}</Badge>
                        ) : (
                          <Badge variant="success">{t("present")}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {e.reason ?? "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <CoinAmount value={e.coins} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function CoinAmount({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  const positive = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        positive ? "text-success" : "text-destructive",
      )}
    >
      <Coins className="size-3.5" />
      {positive ? `+${value}` : value}
    </span>
  );
}
