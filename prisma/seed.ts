import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { GRADE_TYPES, ROLES } from "@/lib/constants";

const PASSWORD = "password123";

// Deterministic-ish helpers for nice-looking demo data.
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

async function main() {
  console.log("Seeding database…");

  // Clean slate (respecting FK order). Deleting groups also clears the
  // implicit student-enrollment join rows.
  await prisma.grade.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --- Subjects ---
  const subjectDefs = [
    { name: "Mathematics", description: "Algebra, geometry and problem solving." },
    { name: "English", description: "Reading, writing and speaking skills." },
    { name: "Physics", description: "Mechanics, energy and motion." },
    { name: "Computer Science", description: "Programming and algorithms." },
  ];
  const subjects: Record<string, { id: string }> = {};
  for (const def of subjectDefs) {
    subjects[def.name] = await prisma.subject.create({ data: def });
  }

  // --- Admin ---
  await prisma.user.create({
    data: {
      name: "Admin User",
      phone: "+998901112201",
      passwordHash,
      role: ROLES.ADMIN,
    },
  });

  // --- Teachers ---
  const teacherDefs = [
    { key: "sarah", name: "Sarah Johnson", phone: "+998901112202" }, // demo teacher
    { key: "david", name: "David Miller", phone: "+998901112204" },
    { key: "aziza", name: "Aziza Karimova", phone: "+998901112205" },
  ];
  const teachers: Record<string, { id: string }> = {};
  for (const def of teacherDefs) {
    teachers[def.key] = await prisma.user.create({
      data: { name: def.name, phone: def.phone, passwordHash, role: ROLES.TEACHER },
    });
  }

  // --- Groups (classes within a subject, each owned by a teacher) ---
  const groupDefs = [
    { key: "mathMorning", name: "Morning group", subject: "Mathematics", teacher: "sarah" },
    { key: "mathEvening", name: "Evening group", subject: "Mathematics", teacher: "sarah" },
    { key: "englishA1", name: "Level A1", subject: "English", teacher: "aziza" },
    { key: "physicsG1", name: "Group 1", subject: "Physics", teacher: "david" },
    { key: "csBeginners", name: "Beginners", subject: "Computer Science", teacher: "david" },
  ];
  const groups: Record<
    string,
    { id: string; subjectId: string; teacherId: string }
  > = {};
  for (const def of groupDefs) {
    const subjectId = subjects[def.subject].id;
    const teacherId = teachers[def.teacher].id;
    const g = await prisma.group.create({
      data: { name: def.name, subjectId, teacherId },
    });
    groups[def.key] = { id: g.id, subjectId, teacherId };
  }

  // --- Students + enrollment ---
  // Most students take a single subject; a few take two (never more — the app
  // enforces a hard cap of 2). The first student is the demo login.
  const studentDefs: { name: string; phone: string; groups: string[] }[] = [
    { name: "Alex Student", phone: "+998901112203", groups: ["mathMorning", "englishA1"] },
    { name: "Emma Wilson", phone: "+998901112206", groups: ["mathMorning"] },
    { name: "Liam Brown", phone: "+998901112207", groups: ["mathEvening"] },
    { name: "Olivia Davis", phone: "+998901112208", groups: ["englishA1"] },
    { name: "Noah Garcia", phone: "+998901112209", groups: ["physicsG1"] },
    { name: "Sophia Martinez", phone: "+998901112210", groups: ["csBeginners"] },
    { name: "Jamshid Rakhimov", phone: "+998901112211", groups: ["mathMorning", "physicsG1"] },
    { name: "Madina Yusupova", phone: "+998901112212", groups: ["englishA1"] },
    { name: "Ethan Clark", phone: "+998901112213", groups: ["mathEvening"] },
    { name: "Ava Lewis", phone: "+998901112214", groups: ["csBeginners", "englishA1"] },
    { name: "Bekzod Tursunov", phone: "+998901112215", groups: ["physicsG1"] },
    { name: "Nilufar Saidova", phone: "+998901112216", groups: ["mathMorning"] },
  ];

  // (student, group) pairs to grade afterwards.
  const enrollments: { studentId: string; groupKey: string }[] = [];
  for (const def of studentDefs) {
    const user = await prisma.user.create({
      data: {
        name: def.name,
        phone: def.phone,
        passwordHash,
        role: ROLES.STUDENT,
        enrolledGroups: { connect: def.groups.map((k) => ({ id: groups[k].id })) },
      },
    });
    for (const groupKey of def.groups) enrollments.push({ studentId: user.id, groupKey });
  }

  // --- Grades: ~6 marks per (student, class) over the last 6 months, trending up. ---
  const now = new Date();
  const POINTS = 6;
  const gradeRows: {
    studentId: string;
    subjectId: string;
    teacherId: string;
    value: number;
    maxValue: number;
    type: string;
    date: Date;
  }[] = [];

  for (const { studentId, groupKey } of enrollments) {
    const group = groups[groupKey];
    const baseline = rand(58, 84); // starting ability in this subject
    for (let p = 0; p < POINTS; p++) {
      const monthsAgo = POINTS - 1 - p;
      const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, randInt(3, 25));
      const value = Math.round(clamp(baseline + p * 2 + rand(-8, 8), 35, 100));
      gradeRows.push({
        studentId,
        subjectId: group.subjectId,
        teacherId: group.teacherId,
        value,
        maxValue: 100,
        type: GRADE_TYPES[p % GRADE_TYPES.length],
        date,
      });
    }
  }

  await prisma.grade.createMany({ data: gradeRows });

  console.log(
    `Seeded: ${subjectDefs.length} subjects, ${groupDefs.length} classes, 1 admin, ${teacherDefs.length} teachers, ${studentDefs.length} students, ${gradeRows.length} grades.`,
  );
  console.log("\nDemo logins (password: password123):");
  console.log("  Admin   → +998901112201");
  console.log("  Teacher → +998901112202");
  console.log("  Student → +998901112203");
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
