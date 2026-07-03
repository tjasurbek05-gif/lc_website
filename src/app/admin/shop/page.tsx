import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { ShopManager, type ProductRow } from "@/components/admin/shop-manager";

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireRole(ROLES.ADMIN);
  const sp = await searchParams;

  const products = await prisma.product.findMany({
    orderBy: [{ disabled: "asc" }, { createdAt: "desc" }],
  });

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    info: p.info,
    price: p.price,
    stock: p.stock,
    disabled: p.disabled,
  }));

  return <ShopManager products={rows} initialNew={Boolean(sp.new)} />;
}
