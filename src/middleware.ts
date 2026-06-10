import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAppSurface } from "@/lib/app-surface";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session-constants";

function databaseEnvPresent(): boolean {
  return Boolean(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL);
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const surface = getAppSurface();

  if (surface === "public") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      return notFound();
    }
    return NextResponse.next();
  }

  if (surface === "admin" && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (!databaseEnvPresent()) return NextResponse.next();

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
  matcher: ["/", "/admin/:path*", "/api/admin/:path*"],
};
