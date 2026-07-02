"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Check, Coins, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteProduct,
  saveProduct,
  toggleProductDisabled,
} from "@/app/actions/shop";

export type ProductRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  info: string | null;
  price: number;
  stock: number;
  disabled: boolean;
};

export function ShopManager({
  products,
  initialNew,
}: {
  products: ProductRow[];
  initialNew?: boolean;
}) {
  const t = useTranslations("shop");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(Boolean(initialNew));
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function openCreate() {
    setEditing(null);
    setError(undefined);
    setOpen(true);
  }
  function openEdit(p: ProductRow) {
    setEditing(p);
    setError(undefined);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await saveProduct({}, new FormData(e.currentTarget));
    setPending(false);
    if (res?.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res?.error ?? "invalid");
    }
  }

  async function onToggle(id: string) {
    await toggleProductDisabled(id);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await deleteProduct(id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("adminHint")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> {t("addProduct")}
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState title={t("noProducts")} icon={<Package />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card
              key={p.id}
              className={`flex flex-col overflow-hidden ${
                p.disabled ? "opacity-60" : ""
              }`}
            >
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
                  {p.disabled ? (
                    <Badge variant="danger">{t("disabled")}</Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/10 px-2.5 py-0.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <Coins className="size-3.5" />
                      {p.price}
                    </span>
                  )}
                </div>
                {p.info ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.info}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("inStock", { count: p.stock })}
                </p>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil /> {tc("edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggle(p.id)}
                    title={p.disabled ? t("enable") : t("disable")}
                  >
                    {p.disabled ? <Check /> : <Ban />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(p.id)}
                    className="text-destructive hover:bg-destructive/10"
                    title={t("remove")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("editProduct") : t("addProduct")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="p-name">{t("productName")}</Label>
            <Input id="p-name" name="name" required defaultValue={editing?.name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-image">
              {t("productImage")}{" "}
              <span className="text-muted-foreground">({tc("optional")})</span>
            </Label>
            <Input
              id="p-image"
              name="imageUrl"
              type="url"
              placeholder="https://…"
              defaultValue={editing?.imageUrl ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-info">
              {t("productInfo")}{" "}
              <span className="text-muted-foreground">({tc("optional")})</span>
            </Label>
            <textarea
              id="p-info"
              name="info"
              rows={3}
              defaultValue={editing?.info ?? ""}
              className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">{t("productPrice")}</Label>
              <Input
                id="p-price"
                name="price"
                type="number"
                min={0}
                required
                defaultValue={editing?.price ?? 10}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">{t("productStock")}</Label>
              <Input
                id="p-stock"
                name="stock"
                type="number"
                min={0}
                required
                defaultValue={editing?.stock ?? 1}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{te(error)}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
