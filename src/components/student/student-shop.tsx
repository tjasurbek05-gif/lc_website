"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Coins, Minus, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { placeOrder } from "@/app/actions/shop";

export type ShopProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  info: string | null;
  price: number;
  stock: number;
};

type OrderRow = {
  id: string;
  productName: string;
  quantity: number;
  coinsSpent: number;
  status: string;
  dateLabel: string;
};

export function StudentShop({
  coins,
  products,
  orders,
  statusPending,
  statusDelivered,
}: {
  coins: number;
  products: ShopProduct[];
  orders: OrderRow[];
  statusPending: string;
  statusDelivered: string;
}) {
  const t = useTranslations("shop");
  const te = useTranslations("errors");
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  const quantityOf = (id: string) => qty[id] ?? 1;
  function setQuantity(id: string, n: number) {
    setQty((prev) => ({ ...prev, [id]: Math.max(1, Math.floor(n) || 1) }));
  }

  async function buy(id: string) {
    const n = quantityOf(id);
    setPendingId(id);
    setError(undefined);
    setNotice(undefined);
    const res = await placeOrder(id, n);
    setPendingId(null);
    if (res?.ok) {
      setQuantity(id, 1);
      setNotice(t("orderPlaced"));
      startTransition(() => router.refresh());
    } else {
      setError(res?.error ?? "invalid");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("shopTitle")}
        description={t("shopHint")}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-base font-semibold text-amber-600 dark:text-amber-400">
            <Coins className="size-5" />
            {coins}
          </span>
        }
      />

      {notice ? (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-2.5 text-sm font-medium text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {te(error)}
        </p>
      ) : null}

      {products.length === 0 ? (
        <EmptyState title={t("noProductsStudent")} icon={<Package />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const n = quantityOf(p.id);
            const total = p.price * n;
            const affordable = coins >= total;
            const busy = pendingId === p.id;
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden">
                <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package className="size-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/10 px-2.5 py-0.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <Coins className="size-3.5" />
                      {p.price}
                    </span>
                  </div>
                  {p.info ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.info}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.stock > 0 ? t("inStock", { count: p.stock }) : t("outOfStock")}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    {/* Quantity stepper */}
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setQuantity(p.id, n - 1)}
                        className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
                        aria-label="-1"
                      >
                        <Minus className="size-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={n}
                        onChange={(e) => setQuantity(p.id, Number(e.target.value))}
                        className="h-9 w-12 border-x border-border bg-card text-center text-sm focus-visible:outline-none"
                        aria-label={t("quantity")}
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(p.id, n + 1)}
                        className="flex size-9 items-center justify-center text-muted-foreground hover:bg-muted"
                        aria-label="+1"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <Button
                      className="flex-1"
                      disabled={!affordable || busy}
                      onClick={() => buy(p.id)}
                    >
                      {busy
                        ? t("ordering")
                        : !affordable
                          ? t("notEnough")
                          : `${t("order")} · ${total}`}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {orders.length ? (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{t("myOrders")}</h2>
          <Card>
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {o.productName}
                      {o.quantity > 1 ? (
                        <span className="text-muted-foreground"> × {o.quantity}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{o.dateLabel}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Coins className="size-3.5" />
                    {o.coinsSpent}
                  </span>
                  <OrderStatusBadge
                    status={o.status}
                    statusPending={statusPending}
                    statusDelivered={statusDelivered}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function OrderStatusBadge({
  status,
  statusPending,
  statusDelivered,
}: {
  status: string;
  statusPending: string;
  statusDelivered: string;
}) {
  const t = useTranslations("shop");
  if (status === statusPending)
    return <Badge variant="warning">{t("statusPending")}</Badge>;
  if (status === statusDelivered)
    return <Badge variant="success">{t("statusDelivered")}</Badge>;
  return <Badge variant="danger">{t("statusRejected")}</Badge>;
}
