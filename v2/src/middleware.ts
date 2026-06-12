import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Candado de superficie (APP_SURFACE)
// ---------------------------------------------------------------------------
// Cada proyecto de Vercel apunta a la misma app v2, pero define APP_SURFACE
// para servir solo su mitad:
//
//   APP_SURFACE=public  → sitio público. /admin (y su API) responden 404.
//   APP_SURFACE=admin   → portal admin. Todo lo público redirige a /admin.
//   APP_SURFACE=all (o sin definir) → todo accesible (desarrollo local).
//
// Así, desde el dominio público no se puede llegar al portal de administrador
// ni escribiendo /admin a mano, y viceversa.

type AppSurface = "public" | "admin" | "all";

function getSurface(): AppSurface {
  const value = (process.env.APP_SURFACE ?? "all").toLowerCase();
  if (value === "public" || value === "admin") return value;
  return "all";
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

// API exclusiva del portal admin (login/logout/me del administrador).
function isAdminApi(pathname: string): boolean {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

export function middleware(req: NextRequest) {
  const surface = getSurface();
  if (surface === "all") return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (surface === "public") {
    // El portal admin no existe en el dominio público.
    if (isAdminPath(pathname) || isAdminApi(pathname)) {
      const home = req.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

  // surface === "admin": solo se sirve el portal y las API routes.
  // /anotar también pasa — es accesible desde ambos dominios (los anotadores
  // no necesitan acceso admin).
  if (
    isAdminPath(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/anotar/")
  ) {
    return NextResponse.next();
  }
  const adminHome = req.nextUrl.clone();
  adminHome.pathname = "/admin";
  adminHome.search = "";
  return NextResponse.redirect(adminHome);
}

export const config = {
  // Ejecuta en todas las rutas excepto assets estáticos de Next y archivos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
