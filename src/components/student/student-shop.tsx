"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coins, Package } from "lucide-react";
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
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const te = useTranslations("errors");
  const [, startTransition] = useTransition();

  async function buy(id: string) {
    setPendingId(id);
    setError(undefined);
    const res = await placeOrder(id);
    setPendingId(null);
    if (res?.ok) {
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
            const affordable = coins >= p.price;
            const inStock = p.stock > 0;
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
                    {inStock ? t("inStock", { count: p.stock }) : t("outOfStock")}
                  </p>
                  <Button
                    className="mt-4"
                    disabled={!affordable || !inStock || busy}
                    onClick={() => buy(p.id)}
                  >
                    {!inStock
                      ? t("outOfStock")
                      : !affordable
                        ? t("notEnough")
                        : busy
                          ? t("ordering")
                          : t("order")}
                  </Button>
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
                    <p className="truncate font-medium">{o.productName}</p>
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
