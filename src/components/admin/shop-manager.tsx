"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Ban,
  Check,
  Coins,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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

/**
 * Load an image file, scale it so its longest side is at most `max` px, and
 * return a compact data URL (WebP where supported, otherwise JPEG). This keeps
 * inline-stored product images small.
 */
async function downscaleImage(file: File, max: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > max || height > max) {
    const scale = Math.min(max / width, max / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const webp = canvas.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp")
    ? webp
    : canvas.toDataURL("image/jpeg", 0.85);
}

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
  // Data-URL of the product image (uploaded + downscaled client-side).
  const [image, setImage] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setImage(null);
    setError(undefined);
    setOpen(true);
  }
  function openEdit(p: ProductRow) {
    setEditing(p);
    setImage(p.imageUrl);
    setError(undefined);
    setOpen(true);
  }

  // Read the chosen file, downscale it to a sensible size and keep it as a
  // compact data URL so images are stored inline — no URLs to paste.
  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("imageType");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("imageTooBig");
      return;
    }
    try {
      const dataUrl = await downscaleImage(file, 640);
      setImage(dataUrl);
      setError(undefined);
    } catch {
      setError("imageType");
    }
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
            <Label>
              {t("productImage")}{" "}
              <span className="text-muted-foreground">({tc("optional")})</span>
            </Label>
            {/* The image travels with the form as a compact data URL. */}
            <input type="hidden" name="imageUrl" value={image ?? ""} />
            <div className="flex items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="size-full object-cover" />
                ) : (
                  <Package className="size-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-muted">
                  <ImagePlus className="size-4" />
                  {image ? t("changeImage") : t("uploadImage")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPickImage}
                  />
                </label>
                {image ? (
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" />
                    {t("removeImage")}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("imageHint")}</span>
                )}
              </div>
            </div>
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
