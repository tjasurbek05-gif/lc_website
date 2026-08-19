import { SignJWT, jwtVerify } from "jose";
import { SESSION_COOKIE, type Role } from "./constants";

// Pure token sign/verify helpers. No "server-only", no next/headers, no bcrypt,
// so this module is safe to import from `proxy.ts` (optimistic auth check).

export { SESSION_COOKIE };

export type SessionPayload = {
  userId: string;
  role: Role;
  name: string;
  phone: string;
};

// AUTH_SECRET must be set in production. Falling back to a hardcoded, publicly
// known secret there would let anyone forge an admin session cookie, so we fail
// loudly instead of silently degrading into an auth bypass. A dev-only fallback
// keeps local `next dev` working without a .env.
const secret = process.env.AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error(
    "AUTH_SECRET is not set. Refusing to run: generate a strong secret and set " +
      "AUTH_SECRET (see .env.example).",
  );
}
const encodedKey = new TextEncoder().encode(
  secret ?? "dev-insecure-secret-change-me",
);

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
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
      typeof payload.phone === "string"
    ) {
      return {
        userId: payload.userId,
        role: payload.role as Role,
        name: payload.name,
        phone: payload.phone,
      };
    }
    return null;
  } catch {
    return null;
  }
}
