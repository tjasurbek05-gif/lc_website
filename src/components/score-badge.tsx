import { Badge } from "@/components/ui/badge";
import { letterGrade } from "@/lib/metrics";

export function ScoreBadge({
  percent,
  showLetter = true,
}: {
  percent: number;
  showLetter?: boolean;
}) {
  const variant = percent >= 80 ? "success" : percent >= 60 ? "primary" : "danger";
  return (
    <Badge variant={variant}>
      {percent}%{showLetter ? ` · ${letterGrade(percent)}` : ""}
    </Badge>
  );
}
