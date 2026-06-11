// Stub — el middleware del app raíz importa este módulo cuando Turbopack
// escanea el repo completo desde el directorio padre. v2 no usa el split
// de superficie; este stub existe solo para que el build no falle.
export type AppSurface = "public" | "admin" | "all";
export function getAppSurface(): AppSurface { return "all"; }
export function isPublicSurface(): boolean { return false; }
export function isAdminSurface(): boolean { return false; }
export function getAdminAppUrl(): string | null { return null; }
export function getPublicAdminHref(): string | null { return "/admin"; }
export function buildAdminHref(path: string): string | null { return path; }
