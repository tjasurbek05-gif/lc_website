"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { deliverOrder, rejectOrder } from "@/app/actions/shop";

export type OrderRow = {
  id: string;
  studentName: string;
  productName: string;
  quantity: number;
  coinsSpent: number;
};

export function OrdersBoard({ orders }: { orders: OrderRow[] }) {
  const t = useTranslations("shop");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function act(id: string, kind: "deliver" | "reject") {
    setPendingId(id);
    const res = kind === "deliver" ? await deliverOrder(id) : await rejectOrder(id);
    setPendingId(null);
    if (res?.ok) startTransition(() => router.refresh());
  }

  if (orders.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title={t("noOrders")} icon={<Coins />} />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {orders.map((o) => {
        const busy = pendingId === o.id;
        return (
          <li
            key={o.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{o.studentName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {o.productName}
                {o.quantity > 1 ? ` × ${o.quantity}` : ""}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Coins className="size-3.5" />
              {o.coinsSpent}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => act(o.id, "deliver")}
              >
                <Check /> {t("deliver")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => act(o.id, "reject")}
              >
                <X /> {t("reject")}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
