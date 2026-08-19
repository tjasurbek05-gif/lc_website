// Shared, framework-agnostic constants. Safe to import anywhere (no server-only deps).

export const ROLES = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  CEO: "CEO",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.CEO];

export const GRADE_TYPES = ["EXAM", "QUIZ", "HOMEWORK", "PROJECT"] as const;
export type GradeType = (typeof GRADE_TYPES)[number];

/**
 * A teacher-run lesson is either a "typical" session or an "exam". The lesson
 * type bounds how many coins a teacher may award (or dock) per student.
 */
export const LESSON_TYPES = ["TYPICAL", "EXAM"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

/** Max magnitude of coins a teacher can give/take per student, by lesson type. */
export const COIN_LIMITS: Record<LessonType, number> = {
  TYPICAL: 4,
  EXAM: 10,
};

/** Coin bound helper: returns the +/- range for a given lesson type. */
export function coinLimitFor(type: string): number {
  return type === "EXAM" ? COIN_LIMITS.EXAM : COIN_LIMITS.TYPICAL;
}

/** Order lifecycle for coin-shop purchases. */
export const ORDER_STATUS = {
  PENDING: "PENDING",
  DELIVERED: "DELIVERED",
  REJECTED: "REJECTED",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** Display / sort order for the People list: admins, then teachers, then students. */
export const ROLE_ORDER: Record<string, number> = {
  ADMIN: 0,
  TEACHER: 1,
  STUDENT: 2,
};

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

/**
 * Admin-configured incentive: a tuition payment recorded on or before this
 * day of the calendar month earns the student a coin bonus (see
 * FinanceSettings.earlyPaymentBonusCoins). Motivates paying on time.
 */
export const EARLY_PAYMENT_DAY = 10;

/**
 * Dashboard KPI only (independent of EARLY_PAYMENT_DAY/the coin bonus): a
 * student counts as an "early payer" if their most recent payment was made
 * on or before this day of the month.
 */
export const EARLY_PAYER_STAT_DAY = 15;

/** Landing path for each role's dashboard. */
export function dashboardPathForRole(role: string): string {
  switch (role) {
    case ROLES.ADMIN:
      return "/admin";
    case ROLES.TEACHER:
      return "/teacher";
    case ROLES.STUDENT:
      return "/student";
    case ROLES.CEO:
      return "/ceo";
    default:
      return "/login";
  }
}

export const SESSION_COOKIE = "lc_session";
