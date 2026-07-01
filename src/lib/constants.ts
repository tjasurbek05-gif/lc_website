// Shared, framework-agnostic constants. Safe to import anywhere (no server-only deps).

export const ROLES = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT];

export const GRADE_TYPES = ["EXAM", "QUIZ", "HOMEWORK", "PROJECT"] as const;
export type GradeType = (typeof GRADE_TYPES)[number];

export const LESSON_STATUS = {
  SCHEDULED: "SCHEDULED",
  CANCELLED: "CANCELLED",
} as const;
export type LessonStatus = (typeof LESSON_STATUS)[keyof typeof LESSON_STATUS];

export const ATTENDANCE_STATUS = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
} as const;
export type AttendanceStatus =
  (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

/** Weekday numbers: 1 = Monday … 7 = Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** i18n keys for weekday labels (see messages `weekdays` section). */
export const WEEKDAY_KEYS: Record<number, string> = {
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
  7: "sun",
};

/**
 * Classes recur on a day pattern rather than a single weekday:
 * ODD  = Mon/Wed/Fri, EVEN = Tue/Thu/Sat. Sunday (7) is a day off — exams or
 * one-off sessions on Sunday are added manually as individual lessons.
 */
export const DAY_PATTERNS = {
  ODD: "ODD",
  EVEN: "EVEN",
} as const;
export type DayPattern = (typeof DAY_PATTERNS)[keyof typeof DAY_PATTERNS];
export const ALL_DAY_PATTERNS: DayPattern[] = [DAY_PATTERNS.ODD, DAY_PATTERNS.EVEN];

/** Weekdays each pattern generates lessons on. */
export const PATTERN_WEEKDAYS: Record<string, number[]> = {
  ODD: [1, 3, 5],
  EVEN: [2, 4, 6],
};

/** Kind of a lesson. Regular lessons come from the timetable; exams/mini-exams
 * are usually added manually (e.g. on a Sunday). */
export const LESSON_TYPES = {
  LESSON: "LESSON",
  EXAM: "EXAM",
  MINI_EXAM: "MINI_EXAM",
} as const;
export type LessonType = (typeof LESSON_TYPES)[keyof typeof LESSON_TYPES];
export const ALL_LESSON_TYPES: LessonType[] = [
  LESSON_TYPES.LESSON,
  LESSON_TYPES.EXAM,
  LESSON_TYPES.MINI_EXAM,
];

/** Landing path for each role's dashboard. */
export function dashboardPathForRole(role: string): string {
  switch (role) {
    case ROLES.ADMIN:
      return "/admin";
    case ROLES.TEACHER:
      return "/teacher";
    case ROLES.STUDENT:
      return "/student";
    default:
      return "/login";
  }
}

export const SESSION_COOKIE = "lc_session";
