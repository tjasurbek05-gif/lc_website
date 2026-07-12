import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

async function main() {
  console.log("Seeding database with Admin and CEO only...");

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash("BrianAdmin", 10);
  const ceoPasswordHash = await bcrypt.hash("BrianCEO", 10);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { phone: "+998956631112" },
    update: {},
    create: {
      name: "Admin User",
      phone: "+998956631112",
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
    },
  });

  // Create CEO
  const ceo = await prisma.user.upsert({
    where: { phone: "+998950150700" },
    update: {},
    create: {
      name: "CEO User",
      phone: "+998950150700",
      passwordHash: ceoPasswordHash,
      role: ROLES.CEO,
    },
  });

  console.log("✅ Admin created:", admin.phone, "→ password: BrianAdmin");
  console.log("✅ CEO created:", ceo.phone, "→ password: BrianCEO");
  console.log("\n✨ Database is ready! Only admin and CEO exist.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
