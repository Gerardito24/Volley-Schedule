import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session-constants";

function databaseEnvPresent(): boolean {
  return Boolean(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL);
}

export function middleware(req: NextRequest) {
  if (!databaseEnvPresent()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (
    pathname === "/admin/login" ||
    pathname === "/admin/setup" ||
    pathname === "/admin/db-migration"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
