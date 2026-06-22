import { SignJWT, jwtVerify } from "jose";
import { SESSION_COOKIE, type Role } from "./constants";

// Pure token sign/verify helpers. No "server-only", no next/headers, no bcrypt,
// so this module is safe to import from `proxy.ts` (optimistic auth check).

export { SESSION_COOKIE };

export type SessionPayload = {
  userId: string;
  role: Role;
  name: string;
  email: string;
};

const secret = process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
const encodedKey = new TextEncoder().encode(secret);

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    if (
      typeof payload.userId === "string" &&
      typeof payload.role === "string" &&
      typeof payload.name === "string" &&
      typeof payload.email === "string"
    ) {
      return {
        userId: payload.userId,
        role: payload.role as Role,
        name: payload.name,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}
