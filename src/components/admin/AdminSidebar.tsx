"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    href: "/admin",
    label: "Inicio",
    match: (path: string) => path === "/admin",
    icon: IconHome,
  },
  {
    href: "/admin/tournaments",
    label: "Torneos",
    match: (path: string) =>
      path === "/admin/tournaments" || path.startsWith("/admin/tournaments/"),
    icon: IconCalendar,
  },
  {
    href: "/admin/registrations",
    label: "Inscripciones",
    match: (path: string) => path.startsWith("/admin/registrations"),
    icon: IconClipboard,
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-300">
      <div className="border-b border-slate-800/80 px-5 py-6">
        <Link href="/admin" className="block">
          <p className="text-lg font-bold tracking-tight text-white">VolleySchedule</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Registro de torneos</p>
          <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-600">
            Plataforma organizador
          </p>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {nav.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sky-600/20 text-white ring-1 ring-sky-500/40"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 px-4 py-4">
        <Link
          href="/"
          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          Ver sitio público (preview) →
        </Link>
      </div>
    </aside>
  );
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
      />
    </svg>
  );
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
