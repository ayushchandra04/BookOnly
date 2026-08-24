import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SESSION_COOKIE = "tbs_session";

const ROLE_PREFIXES = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/organiser", role: "organiser" },
];

const AUTH_ONLY_PREFIXES = ["/bookings", "/waitlist/accept"];

function readSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const roleRule = ROLE_PREFIXES.find((r) => pathname.startsWith(r.prefix));
  const needsAuthOnly = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));

  if (!roleRule && !needsAuthOnly) return NextResponse.next();

  const session = readSession(request);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (roleRule && session.role !== roleRule.role) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/organiser/:path*", "/bookings/:path*", "/waitlist/accept/:path*"],
};
