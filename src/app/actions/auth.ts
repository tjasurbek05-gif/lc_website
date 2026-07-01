"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { dashboardPathForRole, type Role } from "@/lib/constants";
import { loginSchema, normalizePhone } from "@/lib/validations";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  const phone = normalizePhone(parsed.data.phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.active) return { error: "invalidCredentials" };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "invalidCredentials" };

  await createSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    phone: user.phone,
  });

  redirect(dashboardPathForRole(user.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
