"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", exact: true },
  { href: "/admin/torneos", label: "Torneos" },
  { href: "/admin/torneos-activos", label: "Torneos activos" },
  { href: "/admin/inscripciones", label: "Inscripciones" },
  { href: "/admin/equipos", label: "Equipos" },
  { href: "/admin/clientes", label: "Clientes" },
];

interface AdminSidebarProps {
  displayName: string;
  roleLabel: string;
}

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  // Evita que /admin/torneos marque activo /admin/torneos-activos y viceversa
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Operación
      </p>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AdminFooter({ displayName, roleLabel }: AdminSidebarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-zinc-800 px-4 py-4">
      <p className="text-sm font-medium text-white">{displayName}</p>
      <p className="text-xs text-zinc-500">{roleLabel}</p>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="mt-3 w-full rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
      >
        {busy ? "Cerrando…" : "Cerrar sesión"}
      </button>
    </div>
  );
}

export default function AdminSidebar({ displayName, roleLabel }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Barra superior móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-zinc-950 px-4 py-3 text-zinc-300 lg:hidden">
        <p className="text-sm font-semibold text-white">
          VolleyHub <span className="text-zinc-500">·</span> Portal de Administrador
        </p>
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 hover:bg-zinc-800"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </header>
      {open && (
        <div className="z-30 flex flex-col bg-zinc-950 text-zinc-300 lg:hidden">
          <NavLinks pathname={pathname} />
          <AdminFooter displayName={displayName} roleLabel={roleLabel} />
        </div>
      )}

      {/* Barra lateral escritorio */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col bg-zinc-950 text-zinc-300">
        <div className="px-4 py-5">
          <p className="text-sm font-semibold text-white">VolleyHub</p>
          <p className="text-xs text-zinc-500">Portal de Administrador</p>
        </div>
        <NavLinks pathname={pathname} />
        <AdminFooter displayName={displayName} roleLabel={roleLabel} />
      </aside>
    </>
  );
}
