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

/** Weekday numbers used by ClassSchedule: 1 = Monday … 7 = Sunday. */
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
