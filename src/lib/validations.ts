import { z } from "zod";

// Role / grade-type enums as literal tuples (Zod-friendly).
export const roleSchema = z.enum(["ADMIN", "TEACHER", "STUDENT"]);
export const gradeTypeSchema = z.enum(["EXAM", "QUIZ", "HOMEWORK", "PROJECT"]);

/**
 * Phone numbers are the login identifier (replacing email). Kept deliberately
 * loose so international/local formats (e.g. "+998 90 123 45 67") all pass; we
 * only require a sensible amount of digits.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(5, "Phone number is too short")
  .max(24, "Phone number is too long")
  .regex(/^[+\d][\d\s()-]{4,}$/, "Enter a valid phone number");

/**
 * Canonical form of a phone number used as the unique login key: keep a leading
 * "+" and digits only, dropping spaces, dashes and parentheses. This must be
 * applied identically wherever a phone is stored or looked up.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
});

export const userCreateSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  phone: phoneSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: roleSchema,
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  phone: phoneSchema,
  // Optional: only change password when a non-empty value is supplied.
  password: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .pipe(z.string().min(6).optional()),
  role: roleSchema,
  active: z.coerce.boolean().optional(),
});

export const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Group name is required"),
  subjectId: z.string().min(1, "Subject is required"),
  teacherId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Subject name is required"),
  description: z.string().optional().nullable(),
});

export const enrollmentSchema = z.object({
  groupId: z.string().min(1),
  studentId: z.string().min(1),
});

export const gradeCreateSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  value: z.coerce.number().min(0, "Must be 0 or more"),
  maxValue: z.coerce.number().min(1, "Must be at least 1").default(100),
  type: gradeTypeSchema,
  comment: z.string().optional().nullable(),
  date: z.coerce.date().optional(),
});

export const gradeUpdateSchema = gradeCreateSchema.extend({
  id: z.string().min(1),
});

/* --------------------- Scheduling & attendance --------------------- */

export const roomSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Room name is required"),
  capacity: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? Number(v) : null))
    .pipe(z.number().int().min(1).nullable()),
});

// "HH:MM" 24-hour time.
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time (HH:MM)");

export const scheduleSchema = z.object({
  id: z.string().optional(),
  groupId: z.string().min(1),
  pattern: z.enum(["ODD", "EVEN"]),
  startTime: timeSchema,
  durationMin: z.coerce.number().int().min(15).max(480).default(90),
  roomId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const lessonSchema = z.object({
  id: z.string().optional(),
  groupId: z.string().min(1),
  title: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  type: z.enum(["LESSON", "EXAM", "MINI_EXAM"]).default("LESSON"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  startTime: timeSchema,
  endTime: timeSchema,
  roomId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const attendanceItemSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT"]),
  reason: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type GradeCreateInput = z.infer<typeof gradeCreateSchema>;
