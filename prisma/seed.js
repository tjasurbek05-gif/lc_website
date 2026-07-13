const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");
  
  const adminPasswordHash = await bcrypt.hash("BrianAdmin", 10);
  const ceoPasswordHash = await bcrypt.hash("BrianCEO", 10);

  await prisma.user.upsert({
    where: { phone: "+998956631112" },
    update: {},
    create: {
      name: "Admin User",
      phone: "+998956631112",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { phone: "+998950150700" },
    update: {},
    create: {
      name: "CEO User",
      phone: "+998950150700",
      passwordHash: ceoPasswordHash,
      role: "CEO",
    },
  });

  console.log("✅ Done!");
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
