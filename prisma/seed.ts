import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  ATTENDANCE_STATUS,
  GRADE_TYPES,
  LESSON_STATUS,
  LESSON_TYPES,
  PATTERN_WEEKDAYS,
  ROLES,
} from "@/lib/constants";
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
  console.log("Seeding database…");

  // Clean slate (respecting FK order). Deleting groups also clears the
  // implicit student-enrollment join rows.
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

  // --- Class timetables. Each class recurs on an ODD (Mon/Wed/Fri) or EVEN
  //     (Tue/Thu/Sat) pattern. Chosen so no teacher or room clashes. ---
  const DURATION = 90;
  const scheduleDefs = [
    { group: "mathMorning", pattern: "ODD", startTime: "09:00", room: "Room 1" },
    { group: "mathEvening", pattern: "ODD", startTime: "17:00", room: "Room 1" },
    { group: "englishA1", pattern: "EVEN", startTime: "10:00", room: "Room 2" },
    { group: "physicsG1", pattern: "EVEN", startTime: "14:00", room: "Room 3" },
    { group: "csBeginners", pattern: "ODD", startTime: "14:00", room: "Room 2" },
  ];
  for (const s of scheduleDefs) {
    await prisma.classSchedule.create({
      data: {
        groupId: groups[s.group].id,
        pattern: s.pattern,
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

  // Attendance is only recorded for a past lesson if it has already ended.
  // Newer past lessons are left "unmarked" so the teacher calendar shows red.
  async function addAttendance(lessonId: string, studentIds: string[]) {
    if (!studentIds.length) return;
    const rows = studentIds.map((studentId) => {
      const absent = Math.random() < 0.15;
      return {
        lessonId,
        studentId,
        status: absent ? ATTENDANCE_STATUS.ABSENT : ATTENDANCE_STATUS.PRESENT,
        reason: absent ? absenceReasons[randInt(0, absenceReasons.length - 1)] : null,
      };
    });
    await prisma.attendance.createMany({ data: rows });
    attendanceCount += rows.length;
  }

  for (const s of scheduleDefs) {
    const g = groups[s.group];
    const roomId = rooms[s.room].id;
    const studentIds = studentsByGroup.get(s.group) ?? [];
    for (let w = -4; w < 4; w++) {
      const weekStart = addDays(weekBase, w * 7);
      for (const weekday of PATTERN_WEEKDAYS[s.pattern] ?? []) {
        const day = addDays(weekStart, weekday - 1);
        const startAt = atTime(day, s.startTime);
        const endAt = new Date(startAt.getTime() + DURATION * 60_000);
        const lesson = await prisma.lesson.create({
          data: {
            groupId: g.id,
            startAt,
            endAt,
            roomId,
            status: LESSON_STATUS.SCHEDULED,
            type: LESSON_TYPES.LESSON,
          },
        });
        lessonCount++;
        // Mark attendance only for lessons that finished before "last week",
        // leaving the most recent ones unmarked (red on the teacher side).
        if (endAt.getTime() < now.getTime() - 6 * 24 * 3600_000) {
          await addAttendance(lesson.id, studentIds);
        }
      }
    }
  }

  // A one-off Sunday EXAM for the demo Math morning group (Sundays are normally
  // off — exams are added manually as individual lessons).
  {
    const g = groups.mathMorning;
    const lastSunday = atTime(addDays(weekBase, 6 - 7), "10:00"); // previous Sunday
    const exam = await prisma.lesson.create({
      data: {
        groupId: g.id,
        title: "Midterm exam",
        startAt: lastSunday,
        endAt: new Date(lastSunday.getTime() + 120 * 60_000),
        roomId: rooms["Room 1"].id,
        status: LESSON_STATUS.SCHEDULED,
        type: LESSON_TYPES.EXAM,
      },
    });
    lessonCount++;
    await addAttendance(exam.id, studentsByGroup.get("mathMorning") ?? []);
  }

  console.log(
    `Seeded: ${subjectDefs.length} subjects, ${groupDefs.length} classes, 1 admin, ${teacherDefs.length} teachers, ${studentDefs.length} students, ${gradeRows.length} grades, ${roomDefs.length} rooms, ${lessonCount} lessons, ${attendanceCount} attendance records.`,
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
