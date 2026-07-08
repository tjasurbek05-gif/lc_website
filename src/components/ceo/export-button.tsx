"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Downloads the CEO finance export as a fresh file every click. A plain
 * `<a href="/ceo/export">` can end up reusing a stale response from the
 * browser's disk/back-forward cache even with no-store headers on the
 * server — fetching manually with a cache-busting query param and
 * `cache: "no-store"` guarantees a brand-new request every time.
 */
export function ExportButton({ label, downloadingLabel }: { label: string; downloadingLabel: string }) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const res = await fetch(`/ceo/export?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "finance-export.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={pending}>
      <Download />
      {pending ? downloadingLabel : label}
    </Button>
  );
}
