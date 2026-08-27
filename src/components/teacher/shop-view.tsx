import { Coins, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";

export type TeacherShopProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  info: string | null;
  price: number;
  stockLabel: string;
};

/**
 * Read-only view of the coin shop for teachers — browsing only, no buying.
 * A plain (server-renderable) component since nothing here is interactive.
 */
export function TeacherShopView({
  products,
  title,
  hint,
  emptyLabel,
}: {
  products: TeacherShopProduct[];
  title: string;
  hint: string;
  emptyLabel: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={hint} />
      {products.length === 0 ? (
        <EmptyState title={emptyLabel} icon={<Package />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col overflow-hidden">
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="size-full object-cover" />
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
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.info}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">{p.stockLabel}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
