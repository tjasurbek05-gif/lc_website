"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import { productSchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

function revalidateShop() {
  revalidatePath("/admin/shop");
  revalidatePath("/admin");
  revalidatePath("/student/shop");
  revalidatePath("/student");
}

/* ------------------------------ Products ------------------------------ */

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const parsed = productSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    name: formData.get("name"),
    imageUrl: (formData.get("imageUrl") as string) || null,
    info: (formData.get("info") as string) || null,
    price: formData.get("price"),
    stock: formData.get("stock"),
  });
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;

  if (d.id) {
    await prisma.product.update({
      where: { id: d.id },
      data: {
        name: d.name,
        imageUrl: d.imageUrl,
        info: d.info,
        price: d.price,
        stock: d.stock,
      },
    });
  } else {
    await prisma.product.create({
      data: {
        name: d.name,
        imageUrl: d.imageUrl,
        info: d.info,
        price: d.price,
        stock: d.stock,
      },
    });
  }
  revalidateShop();
  return { ok: true };
}

/** Toggle a product's availability (disabled hides it from the shop). */
export async function toggleProductDisabled(id: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const product = await prisma.product.findUnique({
    where: { id },
    select: { disabled: true },
  });
  if (!product) return { error: "invalid" };
  await prisma.product.update({
    where: { id },
    data: { disabled: !product.disabled },
  });
  revalidateShop();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  await prisma.product.delete({ where: { id } });
  revalidateShop();
  return { ok: true };
}

/* ------------------------------- Orders ------------------------------- */

/**
 * A student places an order for one or more units of a product. The only limit
 * is affordability: a student may order any quantity as long as their balance
 * covers price × quantity. Coins are deducted and stock reduced by the quantity
 * up front. Admins later deliver (fulfil) or reject (refund + restock) it.
 */
export async function placeOrder(
  productId: string,
  quantity = 1,
): Promise<ActionState> {
  const session = await requireRole(ROLES.STUDENT);

  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty < 1) return { error: "invalid" };

  const result = await prisma.$transaction(async (tx) => {
    const [product, student] = await Promise.all([
      tx.product.findUnique({ where: { id: productId } }),
      tx.user.findUnique({ where: { id: session.userId }, select: { coins: true } }),
    ]);
    if (!product || product.disabled) return { error: "invalid" as const };
    const total = product.price * qty;
    if (!student || student.coins < total) {
      return { error: "notEnoughCoins" as const };
    }

    await tx.user.update({
      where: { id: session.userId },
      data: { coins: { decrement: total } },
    });
    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: qty } },
    });
    await tx.order.create({
      data: {
        studentId: session.userId,
        productId: product.id,
        productName: product.name,
        quantity: qty,
        coinsSpent: total,
        status: ORDER_STATUS.PENDING,
      },
    });
    return { ok: true as const };
  });

  revalidateShop();
  return result;
}

/** Admin marks a pending order delivered — it leaves the "all orders" list. */
export async function deliverOrder(id: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);
  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!order || order.status !== ORDER_STATUS.PENDING) return { error: "invalid" };
  await prisma.order.update({
    where: { id },
    data: { status: ORDER_STATUS.DELIVERED },
  });
  revalidateShop();
  return { ok: true };
}

/**
 * Admin rejects a pending order: restock the product (if it still exists) and
 * refund the coins the student spent.
 */
export async function rejectOrder(id: string): Promise<ActionState> {
  await requireRole(ROLES.ADMIN);

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order || order.status !== ORDER_STATUS.PENDING) return;

    await tx.user.update({
      where: { id: order.studentId },
      data: { coins: { increment: order.coinsSpent } },
    });
    if (order.productId) {
      await tx.product.update({
        where: { id: order.productId },
        data: { stock: { increment: order.quantity } },
      });
    }
    await tx.order.update({
      where: { id },
      data: { status: ORDER_STATUS.REJECTED },
    });
  });

  revalidateShop();
  return { ok: true };
}

/** Small helper used by pages that need the current user's coin balance. */
export async function myCoins(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { coins: true },
  });
  return me?.coins ?? 0;
}
