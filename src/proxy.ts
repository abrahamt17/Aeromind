import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/routes";

const PROTECTED_PREFIXES = ["/trainee", "/psychologist"];

/**
 * Sends visitors with no session to sign in. This is only a first filter: each
 * page verifies the session and role with requireRole(), and Row Level Security
 * protects the data itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/trainee/:path*", "/psychologist/:path*"],
};
