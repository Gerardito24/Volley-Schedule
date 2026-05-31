export type AppSurface = "public" | "admin" | "all";

/** Deploy surface from NEXT_PUBLIC_APP_SURFACE; "all" = local dev (both surfaces). */
export function getAppSurface(): AppSurface {
  const raw = process.env.NEXT_PUBLIC_APP_SURFACE?.trim().toLowerCase();
  if (raw === "public") return "public";
  if (raw === "admin") return "admin";
  return "all";
}

export function isPublicSurface(): boolean {
  return getAppSurface() === "public";
}

export function isAdminSurface(): boolean {
  return getAppSurface() === "admin";
}

export function getAdminAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

/** Admin panel href for public UI; null when public surface has no external admin URL. */
export function getPublicAdminHref(): string | null {
  const external = getAdminAppUrl();
  const surface = getAppSurface();

  if (surface === "public") {
    return external ? `${external}/admin` : null;
  }

  return external ? `${external}/admin` : "/admin";
}

/** Build an admin path href; null on public surface without external admin URL. */
export function buildAdminHref(adminPath: string): string | null {
  const normalized = adminPath.startsWith("/") ? adminPath : `/${adminPath}`;
  const external = getAdminAppUrl();
  const surface = getAppSurface();

  if (surface === "public") {
    if (!external) return null;
    return `${external}${normalized}`;
  }

  return external ? `${external}${normalized}` : normalized;
}
