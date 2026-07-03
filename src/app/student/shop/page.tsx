import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { StudentShop, type ShopProduct } from "@/components/student/student-shop";

export default async function StudentShopPage() {
  const session = await requireRole(ROLES.STUDENT);
  const locale = await getLocale();

  const [me, products, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { coins: true },
    }),
    prisma.product.findMany({
      where: { disabled: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { studentId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const coins = me?.coins ?? 0;

  const shopProducts: ShopProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    info: p.info,
    price: p.price,
    stock: p.stock,
  }));

  const orderRows = orders.map((o) => ({
    id: o.id,
    productName: o.productName,
    quantity: o.quantity,
    coinsSpent: o.coinsSpent,
    status: o.status,
    dateLabel: formatDate(o.createdAt, locale),
  }));

  return (
    <StudentShop
      coins={coins}
      products={shopProducts}
      orders={orderRows}
      statusPending={ORDER_STATUS.PENDING}
      statusDelivered={ORDER_STATUS.DELIVERED}
    />
  );
}
