export type AdminBreadcrumb = { label: string; href?: string };

export type AdminNavItem = {
  href: string;
  label: string;
  section: "operacion" | "administracion";
  match: (path: string) => boolean;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Inicio",
    section: "operacion",
    match: (path) => path === "/admin",
  },
  {
    href: "/admin/tournaments",
    label: "Torneos",
    section: "operacion",
    match: (path) => path === "/admin/tournaments" || path.startsWith("/admin/tournaments/"),
  },
  {
    href: "/admin/torneos-activos",
    label: "Torneos activos",
    section: "operacion",
    match: (path) => path.startsWith("/admin/torneos-activos"),
  },
  {
    href: "/admin/registrations",
    label: "Inscripciones",
    section: "operacion",
    match: (path) => path.startsWith("/admin/registrations"),
  },
  {
    href: "/admin/equipos",
    label: "Equipos",
    section: "operacion",
    match: (path) => path.startsWith("/admin/equipos"),
  },
  {
    href: "/admin/profiles",
    label: "Perfiles",
    section: "administracion",
    match: (path) => path.startsWith("/admin/profiles"),
  },
];

export const adminNavSections = [
  { id: "operacion" as const, label: "Operación" },
  { id: "administracion" as const, label: "Administración" },
];

const staticTitles: Record<string, { title: string; breadcrumbs: AdminBreadcrumb[] }> = {
  "/admin": { title: "Inicio", breadcrumbs: [{ label: "Inicio" }] },
  "/admin/tournaments": {
    title: "Torneos",
    breadcrumbs: [{ label: "Inicio", href: "/admin" }, { label: "Torneos" }],
  },
  "/admin/tournaments/new": {
    title: "Crear torneo",
    breadcrumbs: [
      { label: "Inicio", href: "/admin" },
      { label: "Torneos", href: "/admin/tournaments" },
      { label: "Crear torneo" },
    ],
  },
  "/admin/torneos-activos": {
    title: "Torneos activos",
    breadcrumbs: [{ label: "Inicio", href: "/admin" }, { label: "Torneos activos" }],
  },
  "/admin/registrations": {
    title: "Inscripciones",
    breadcrumbs: [{ label: "Inicio", href: "/admin" }, { label: "Inscripciones" }],
  },
  "/admin/registrations/import": {
    title: "Importar inscripciones",
    breadcrumbs: [
      { label: "Inicio", href: "/admin" },
      { label: "Inscripciones", href: "/admin/registrations" },
      { label: "Importar" },
    ],
  },
  "/admin/equipos": {
    title: "Equipos",
    breadcrumbs: [{ label: "Inicio", href: "/admin" }, { label: "Equipos" }],
  },
  "/admin/profiles": {
    title: "Perfiles",
    breadcrumbs: [{ label: "Inicio", href: "/admin" }, { label: "Perfiles" }],
  },
  "/admin/login": { title: "Iniciar sesión", breadcrumbs: [{ label: "Portal de Administrador" }] },
  "/admin/setup": { title: "Configuración inicial", breadcrumbs: [{ label: "Portal de Administrador" }] },
};

export function resolveAdminPageMeta(pathname: string): { title: string; breadcrumbs: AdminBreadcrumb[] } {
  if (staticTitles[pathname]) return staticTitles[pathname];

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin") {
    return { title: "Portal de Administrador", breadcrumbs: [{ label: "Inicio", href: "/admin" }] };
  }

  if (parts[1] === "tournaments" && parts[2] && parts[3] === "schedule") {
    return {
      title: "Itinerario",
      breadcrumbs: [
        { label: "Inicio", href: "/admin" },
        { label: "Torneos", href: "/admin/tournaments" },
        { label: "Torneo", href: `/admin/tournaments/${parts[2]}` },
        { label: "Itinerario" },
      ],
    };
  }

  if (parts[1] === "tournaments" && parts[2]) {
    return {
      title: "Detalle del torneo",
      breadcrumbs: [
        { label: "Inicio", href: "/admin" },
        { label: "Torneos", href: "/admin/tournaments" },
        { label: "Detalle" },
      ],
    };
  }

  if (parts[1] === "torneos-activos" && parts[2]) {
    return {
      title: "Marcadores en vivo",
      breadcrumbs: [
        { label: "Inicio", href: "/admin" },
        { label: "Torneos activos", href: "/admin/torneos-activos" },
        { label: "Marcadores" },
      ],
    };
  }

  if (parts[1] === "registrations" && parts[2]) {
    return {
      title: "Detalle de inscripción",
      breadcrumbs: [
        { label: "Inicio", href: "/admin" },
        { label: "Inscripciones", href: "/admin/registrations" },
        { label: "Detalle" },
      ],
    };
  }

  if (parts[1] === "equipos" && parts[2] && parts[3] === "roster" && parts[4]) {
    return {
      title: "Roster",
      breadcrumbs: [
        { label: "Inicio", href: "/admin" },
        { label: "Equipos", href: "/admin/equipos" },
        { label: "Club", href: `/admin/equipos/${parts[2]}` },
        { label: "Roster" },
      ],
    };
  }

  if (parts[1] === "equipos" && parts[2]) {
    return {
      title: "Detalle del club",
      breadcrumbs: [
        { label: "Inicio", href: "/admin" },
        { label: "Equipos", href: "/admin/equipos" },
        { label: "Club" },
      ],
    };
  }

  const item = adminNavItems.find((n) => n.match(pathname));
  if (item) {
    return {
      title: item.label,
      breadcrumbs: [{ label: "Inicio", href: "/admin" }, { label: item.label }],
    };
  }

  return { title: "Portal de Administrador", breadcrumbs: [{ label: "Inicio", href: "/admin" }] };
}
