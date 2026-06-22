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
