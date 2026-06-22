import { z } from "zod";

// Role / grade-type enums as literal tuples (Zod-friendly).
export const roleSchema = z.enum(["ADMIN", "TEACHER", "STUDENT"]);
export const gradeTypeSchema = z.enum(["EXAM", "QUIZ", "HOMEWORK", "PROJECT"]);

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export const userCreateSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: roleSchema,
  groupId: z.string().optional().nullable(),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  email: z.email(),
  // Optional: only change password when a non-empty value is supplied.
  password: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .pipe(z.string().min(6).optional()),
  role: roleSchema,
  groupId: z.string().optional().nullable(),
  active: z.coerce.boolean().optional(),
});

export const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Group name is required"),
});

export const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Subject name is required"),
  description: z.string().optional().nullable(),
});

export const teacherAssignmentSchema = z.object({
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
  groupId: z.string().min(1),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type GradeCreateInput = z.infer<typeof gradeCreateSchema>;
