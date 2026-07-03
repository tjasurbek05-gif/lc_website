"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { dashboardPathForRole, type Role } from "@/lib/constants";
import { loginSchema, normalizePhone } from "@/lib/validations";
import { checkRateLimit, recordFailure, recordSuccess } from "@/lib/rate-limit";

export type LoginState = { error?: string };

// A valid bcrypt hash (cost 10) of an unguessable value. When the phone doesn't
// exist we still run a bcrypt compare against this so the response time doesn't
// reveal whether an account exists (closes the enumeration timing side-channel).
const DUMMY_HASH = "$2b$10$GZTckobvTh.sW0PUFYs8C.o.yINmzrJIzw1KH9/IXf2vt0Hk9uDj.";

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

  // Throttle repeated attempts per phone to blunt online guessing.
  if (!checkRateLimit(phone).allowed) return { error: "tooManyAttempts" };

  const user = await prisma.user.findUnique({ where: { phone } });
  // Always run a compare (dummy hash for unknown/inactive users) so timing
  // doesn't leak whether the account exists.
  const ok = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !user.active || !ok) {
    recordFailure(phone);
    return { error: "invalidCredentials" };
  }

  recordSuccess(phone);
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
