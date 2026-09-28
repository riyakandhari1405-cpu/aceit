import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const protectedPaths = ["/dashboard", "/profile", "/prepare", "/portfolio", "/insights", "/analysis", "/questions", "/interview", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/prepare",
    "/prepare/:path*",
    "/portfolio",
    "/portfolio/:path*",
    "/insights",
    "/insights/:path*",
    "/analysis",
    "/analysis/:path*",
    "/questions",
    "/questions/:path*",
    "/interview",
    "/interview/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
