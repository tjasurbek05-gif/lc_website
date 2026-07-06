import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  ATTENDANCE_STATUS,
  GRADE_TYPES,
  LESSON_STATUS,
  ROLES,
} from "@/lib/constants";
import { addOneMonth } from "@/lib/finance";
import { addDays, startOfWeek } from "@/lib/utils";

const PASSWORD = "password123";

// Deterministic-ish helpers for nice-looking demo data.
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Combine a Date's day with an "HH:MM" time into a new local Date. */
function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

async function main() {
  // Guard: this wipes all data and creates well-known demo accounts (including
  // an admin with a public password). Never let it run against production.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Refusing to seed with NODE_ENV=production. This deletes all data and " +
        "creates demo accounts. Set ALLOW_PROD_SEED=true only if you are certain.",
    );
  }

  console.log("Seeding database…");

  // Clean slate (respecting FK order). Deleting groups also clears the
  // implicit student-enrollment join rows.
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.roomAssignment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.teacherPayout.deleteMany();
  await prisma.financeSettings.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.classSchedule.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.group.deleteMany();
  await prisma.room.deleteMany();
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

  // --- CEO ---
  await prisma.user.create({
    data: {
      name: "CEO User",
      phone: "+998901112217",
      passwordHash,
      role: ROLES.CEO,
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

  // --- Rooms ---
  const roomDefs = ["Room 1", "Room 2", "Room 3"];
  const rooms: Record<string, { id: string }> = {};
  for (const name of roomDefs) {
    rooms[name] = await prisma.room.create({
      data: { name, capacity: randInt(10, 20) },
    });
  }

  // --- Class timetables (weekly). Chosen so no teacher or room clashes. ---
  const DURATION = 90;
  const scheduleDefs = [
    { group: "mathMorning", weekday: 1, startTime: "09:00", room: "Room 1" },
    { group: "mathMorning", weekday: 3, startTime: "09:00", room: "Room 1" },
    { group: "mathEvening", weekday: 1, startTime: "17:00", room: "Room 1" },
    { group: "mathEvening", weekday: 3, startTime: "17:00", room: "Room 1" },
    { group: "englishA1", weekday: 2, startTime: "10:00", room: "Room 2" },
    { group: "englishA1", weekday: 4, startTime: "10:00", room: "Room 2" },
    { group: "physicsG1", weekday: 2, startTime: "14:00", room: "Room 3" },
    { group: "physicsG1", weekday: 5, startTime: "14:00", room: "Room 3" },
    { group: "csBeginners", weekday: 3, startTime: "14:00", room: "Room 2" },
    { group: "csBeginners", weekday: 5, startTime: "16:00", room: "Room 2" },
  ];
  for (const s of scheduleDefs) {
    await prisma.classSchedule.create({
      data: {
        groupId: groups[s.group].id,
        weekday: s.weekday,
        startTime: s.startTime,
        durationMin: DURATION,
        roomId: rooms[s.room].id,
      },
    });
  }

  // --- Lessons: 4 past + 4 upcoming weeks generated from the timetable, with
  //     attendance recorded for the past ones (mostly present, some absent). ---
  const studentsByGroup = new Map<string, string[]>();
  for (const e of enrollments) {
    const arr = studentsByGroup.get(e.groupKey) ?? [];
    arr.push(e.studentId);
    studentsByGroup.set(e.groupKey, arr);
  }

  const absenceReasons = ["Sick", "Family reasons", "Travelling", "No reason given"];
  const weekBase = startOfWeek(now);
  let lessonCount = 0;
  let attendanceCount = 0;

  // Coins each student has earned in class (added to their balance later so the
  // shop is usable straight away).
  const coinsByStudent = new Map<string, number>();
  const addCoins = (studentId: string, n: number) =>
    coinsByStudent.set(studentId, (coinsByStudent.get(studentId) ?? 0) + n);

  for (const s of scheduleDefs) {
    const g = groups[s.group];
    const roomId = rooms[s.room].id;
    const studentIds = studentsByGroup.get(s.group) ?? [];
    for (let w = -4; w < 4; w++) {
      const weekStart = addDays(weekBase, w * 7);
      const day = addDays(weekStart, s.weekday - 1);
      const startAt = atTime(day, s.startTime);
      const endAt = new Date(startAt.getTime() + DURATION * 60_000);
      // Roughly every fourth past lesson is an exam (wider coin range).
      const isExam = w === -1;
      const lessonType = isExam ? "EXAM" : "TYPICAL";
      const limit = isExam ? 10 : 4;
      const lesson = await prisma.lesson.create({
        data: {
          groupId: g.id,
          title: isExam ? "Exam" : `Lesson ${w + 5}`,
          type: lessonType,
          startAt,
          endAt,
          roomId,
          status: LESSON_STATUS.SCHEDULED,
        },
      });
      lessonCount++;
      if (startAt.getTime() < now.getTime() && studentIds.length) {
        const rows = studentIds.map((studentId) => {
          const absent = Math.random() < 0.15;
          // Present students earn a few coins (an exam can award more, or dock).
          const coins = absent ? 0 : randInt(isExam ? -2 : 1, limit);
          if (coins !== 0) addCoins(studentId, coins);
          return {
            lessonId: lesson.id,
            studentId,
            status: absent ? ATTENDANCE_STATUS.ABSENT : ATTENDANCE_STATUS.PRESENT,
            reason: absent
              ? absenceReasons[randInt(0, absenceReasons.length - 1)]
              : null,
            coins,
          };
        });
        await prisma.attendance.createMany({ data: rows });
        attendanceCount += rows.length;
      }
    }
  }

  // Apply earned coins to each student's balance.
  for (const [studentId, coins] of coinsByStudent) {
    if (coins > 0) {
      await prisma.user.update({
        where: { id: studentId },
        data: { coins: { increment: coins } },
      });
    }
  }

  // --- Room assignments: put each class's teacher in its room for the weekly
  //     slot (drives the teacher's "class hours" and blocks the room). ---
  const addMinutesHHMM = (hhmm: string, min: number) => {
    const [h, m] = hhmm.split(":").map(Number);
    const total = h * 60 + m + min;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  let assignmentCount = 0;
  for (const s of scheduleDefs) {
    const g = groups[s.group];
    await prisma.roomAssignment.create({
      data: {
        roomId: rooms[s.room].id,
        teacherId: g.teacherId,
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: addMinutesHHMM(s.startTime, DURATION),
      },
    });
    assignmentCount++;
  }

  // --- Coin shop products ---
  const productDefs = [
    { name: "Notebook", info: "A5 ruled notebook, 96 pages.", price: 15, stock: 20 },
    { name: "Gel pen set", info: "Set of 6 colored gel pens.", price: 10, stock: 25 },
    { name: "Water bottle", info: "500ml reusable bottle with the center's logo.", price: 30, stock: 8 },
    { name: "Sticker pack", info: "Fun sticker sheet for laptops and notebooks.", price: 5, stock: 40 },
    { name: "Movie ticket", info: "One ticket to the end-of-term movie afternoon.", price: 50, stock: 5 },
    { name: "Backpack", info: "Durable school backpack.", price: 120, stock: 3, disabled: true },
  ];
  const products: { id: string; name: string; price: number }[] = [];
  for (const def of productDefs) {
    const p = await prisma.product.create({ data: def });
    products.push({ id: p.id, name: p.name, price: p.price });
  }

  // --- A few pending orders (coins already deducted, stock decremented). ---
  const orderable = products.filter((p) => p.price <= 30);
  const buyers = enrollments
    .map((e) => e.studentId)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);
  let orderCount = 0;
  for (let i = 0; i < buyers.length; i++) {
    const studentId = buyers[i];
    const product = orderable[i % orderable.length];
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { coins: true },
    });
    if (!student || student.coins < product.price) continue;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: studentId },
        data: { coins: { decrement: product.price } },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: 1 } },
      }),
      prisma.order.create({
        data: {
          studentId,
          productId: product.id,
          productName: product.name,
          coinsSpent: product.price,
          status: "PENDING",
        },
      }),
    ]);
    orderCount++;
  }

  // --- Finance: fixed tuition fee, teacher salaries/payouts, student payments ---
  const TUITION_FEE = 900_000; // so'm per month, fixed by the administrator

  await prisma.financeSettings.create({
    data: { id: "singleton", tuitionFee: TUITION_FEE },
  });

  // Fixed monthly salaries, set by the CEO.
  const salaryByTeacherKey: Record<string, number> = {
    sarah: 4_500_000,
    david: 4_000_000,
    aziza: 4_200_000,
  };
  for (const [key, teacher] of Object.entries(teachers)) {
    await prisma.user.update({
      where: { id: teacher.id },
      data: { salary: salaryByTeacherKey[key] },
    });
  }

  // Payouts for the last 2 months are paid; the current month is still pending.
  let payoutCount = 0;
  for (const [key, teacher] of Object.entries(teachers)) {
    const salary = salaryByTeacherKey[key];
    for (let m = 2; m >= 0; m--) {
      const periodDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, "0")}`;
      const paid = m > 0;
      await prisma.teacherPayout.create({
        data: {
          teacherId: teacher.id,
          period,
          amount: salary,
          paidAt: paid
            ? new Date(periodDate.getFullYear(), periodDate.getMonth(), randInt(3, 10))
            : null,
        },
      });
      payoutCount++;
    }
  }

  // Rolling monthly tuition cycles per student: a few months of paid history,
  // then one open cycle — either still upcoming (good standing) or already
  // overdue. Every 6th student has no history yet (just added, not billed).
  const allStudents = await prisma.user.findMany({
    where: { role: ROLES.STUDENT },
    select: { id: true },
  });
  let paymentCount = 0;
  for (let i = 0; i < allStudents.length; i++) {
    if (i % 6 === 5) continue; // hasn't started billing yet
    const studentId = allStudents[i].id;

    const cycles = randInt(2, 5);
    const overdue = i % 5 === 4;
    const lastPaidAt = overdue
      ? addDays(now, -randInt(33, 50)) // missed the ~1-month mark
      : addDays(now, -randInt(2, 25)); // paid recently, next due date still ahead

    const paidDates: Date[] = [lastPaidAt];
    for (let c = 1; c < cycles; c++) {
      paidDates.unshift(addDays(paidDates[0], -30));
    }

    const rows: { studentId: string; amount: number; dueDate: Date; paidAt: Date | null }[] =
      paidDates.map((paidAt, idx) => ({
        studentId,
        amount: TUITION_FEE,
        dueDate: idx === 0 ? paidAt : addOneMonth(paidDates[idx - 1]),
        paidAt,
      }));
    rows.push({
      studentId,
      amount: TUITION_FEE,
      dueDate: addOneMonth(lastPaidAt),
      paidAt: null,
    });

    await prisma.payment.createMany({ data: rows });
    paymentCount += rows.length;
  }

  console.log(
    `Seeded: ${subjectDefs.length} subjects, ${groupDefs.length} classes, 1 admin, 1 CEO, ${teacherDefs.length} teachers, ${studentDefs.length} students, ${gradeRows.length} grades, ${roomDefs.length} rooms, ${assignmentCount} room assignments, ${lessonCount} lessons, ${attendanceCount} attendance records, ${productDefs.length} products, ${orderCount} orders, ${payoutCount} teacher payouts, ${paymentCount} tuition payments.`,
  );
  console.log("\nDemo logins (password: password123):");
  console.log("  Admin   → +998901112201");
  console.log("  CEO     → +998901112217");
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
