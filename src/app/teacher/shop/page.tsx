import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { TeacherShopView, type TeacherShopProduct } from "@/components/teacher/shop-view";

export default async function TeacherShopPage() {
  await requireRole(ROLES.TEACHER);
  const t = await getTranslations("shop");

  const products = await prisma.product.findMany({
    where: { disabled: false },
    orderBy: { createdAt: "desc" },
  });

  const shopProducts: TeacherShopProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    info: p.info,
    price: p.price,
    stockLabel: p.stock > 0 ? t("inStock", { count: p.stock }) : t("outOfStock"),
  }));

  return (
    <TeacherShopView
      products={shopProducts}
      title={t("shopTitle")}
      hint={t("teacherShopHint")}
      emptyLabel={t("noProductsTeacher")}
    />
  );
}
