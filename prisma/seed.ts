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

  // Clean slate (respecting FK order).
  await prisma.grade.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();
  await prisma.subject.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Groups
  const groupA = await prisma.group.create({ data: { name: "Group A" } });
  const groupB = await prisma.group.create({ data: { name: "Group B" } });

  // Subjects
  const subjectDefs = [
    { name: "Mathematics", description: "Algebra, geometry and problem solving." },
    { name: "English", description: "Reading, writing and speaking skills." },
    { name: "Physics", description: "Mechanics, energy and motion." },
    { name: "Computer Science", description: "Programming and algorithms." },
    { name: "Chemistry", description: "Matter, reactions and lab work." },
  ];
  const subjects: Record<string, { id: string }> = {};
  for (const def of subjectDefs) {
    subjects[def.name] = await prisma.subject.create({ data: def });
  }

  // Admin
  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@demo.com",
      passwordHash,
      role: ROLES.ADMIN,
    },
  });

  // Teachers
  const teacherDefs = [
    { name: "Sarah Johnson", email: "teacher@demo.com" },
    { name: "David Miller", email: "david@demo.com" },
    { name: "Aziza Karimova", email: "aziza@demo.com" },
  ];
  const teachers: Record<string, { id: string }> = {};
  for (const def of teacherDefs) {
    teachers[def.email] = await prisma.user.create({
      data: { ...def, passwordHash, role: ROLES.TEACHER },
    });
  }

  // Students (first one is the demo student, placed in Group A).
  const studentNames = [
    "Alex Student",
    "Emma Wilson",
    "Liam Brown",
    "Olivia Davis",
    "Noah Garcia",
    "Sophia Martinez",
    "Jamshid Rakhimov",
    "Madina Yusupova",
    "Ethan Clark",
    "Ava Lewis",
    "Bekzod Tursunov",
    "Nilufar Saidova",
  ];
  const students: { id: string; groupId: string }[] = [];
  for (let i = 0; i < studentNames.length; i++) {
    const name = studentNames[i];
    const email =
      i === 0 ? "student@demo.com" : `${name.toLowerCase().split(" ")[0]}${i}@demo.com`;
    const groupId = i % 2 === 0 ? groupA.id : groupB.id;
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: ROLES.STUDENT, groupId },
    });
    students.push({ id: user.id, groupId });
  }

  // Teaching assignments: which teacher teaches which subject to which group.
  const assignments = [
    { teacher: "teacher@demo.com", subject: "Mathematics", group: groupA.id },
    { teacher: "teacher@demo.com", subject: "Mathematics", group: groupB.id },
    { teacher: "teacher@demo.com", subject: "Physics", group: groupB.id },
    { teacher: "david@demo.com", subject: "Physics", group: groupA.id },
    { teacher: "david@demo.com", subject: "Computer Science", group: groupA.id },
    { teacher: "david@demo.com", subject: "Computer Science", group: groupB.id },
    { teacher: "aziza@demo.com", subject: "English", group: groupA.id },
    { teacher: "aziza@demo.com", subject: "English", group: groupB.id },
    { teacher: "aziza@demo.com", subject: "Chemistry", group: groupB.id },
  ];

  // teacherId for a given (subjectId, groupId)
  const teacherFor = new Map<string, string>();
  for (const a of assignments) {
    const teacherId = teachers[a.teacher].id;
    const subjectId = subjects[a.subject].id;
    await prisma.teacherSubject.create({
      data: { teacherId, subjectId, groupId: a.group },
    });
    teacherFor.set(`${subjectId}:${a.group}`, teacherId);
  }

  // Grades: ~6 marks per student-subject over the last 6 months, trending upward.
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

  for (const student of students) {
    const subjectsForGroup = assignments.filter((a) => a.group === student.groupId);
    for (const a of subjectsForGroup) {
      const subjectId = subjects[a.subject].id;
      const teacherId = teacherFor.get(`${subjectId}:${student.groupId}`);
      if (!teacherId) continue;
      const baseline = rand(58, 84); // student's starting ability in this subject
      for (let p = 0; p < POINTS; p++) {
        const monthsAgo = POINTS - 1 - p;
        const date = new Date(
          now.getFullYear(),
          now.getMonth() - monthsAgo,
          randInt(3, 25),
        );
        const value = Math.round(clamp(baseline + p * 2 + rand(-8, 8), 35, 100));
        gradeRows.push({
          studentId: student.id,
          subjectId,
          teacherId,
          value,
          maxValue: 100,
          type: GRADE_TYPES[p % GRADE_TYPES.length],
          date,
        });
      }
    }
  }

  await prisma.grade.createMany({ data: gradeRows });

  console.log(
    `Seeded: 2 groups, ${subjectDefs.length} subjects, 1 admin, ${teacherDefs.length} teachers, ${students.length} students, ${gradeRows.length} grades.`,
  );
  console.log("\nDemo logins (password: password123):");
  console.log("  Admin   → admin@demo.com");
  console.log("  Teacher → teacher@demo.com");
  console.log("  Student → student@demo.com");
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
