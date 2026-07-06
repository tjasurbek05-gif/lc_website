import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dashboardPathForRole } from "@/lib/constants";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Next.js 16 renamed `middleware` to `proxy` (runs in the Node.js runtime).
// This is an OPTIMISTIC auth gate for fast redirects; every page/layout and
// server action still re-checks the session server-side (defense in depth).

const ROLE_BY_PREFIX: Record<string, string> = {
  "/admin": "ADMIN",
  "/teacher": "TEACHER",
  "/student": "STUDENT",
  "/ceo": "CEO",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  // Signed-in users should skip the login page.
  if (pathname === "/login" && session) {
    return NextResponse.redirect(
      new URL(dashboardPathForRole(session.role), request.url),
    );
  }

  const prefix = Object.keys(ROLE_BY_PREFIX).find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (prefix) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== ROLE_BY_PREFIX[prefix]) {
      return NextResponse.redirect(
        new URL(dashboardPathForRole(session.role), request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/ceo/:path*", "/login"],
};
