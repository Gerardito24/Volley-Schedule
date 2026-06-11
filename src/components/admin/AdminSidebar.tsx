"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems, adminNavSections } from "@/lib/admin-nav";

export function AdminSidebar({ menuOpen }: { menuOpen: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "flex w-64 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-300",
        "fixed inset-y-0 left-0 z-40 shadow-2xl transition-transform duration-200 ease-out",
        "lg:relative lg:z-0 lg:translate-x-0 lg:shadow-none",
        menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
    >
      <div className="border-b border-slate-800/80 px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top,0px))] lg:pt-6">
        <Link href="/admin" className="block">
          <p className="text-lg font-bold tracking-tight text-white">VolleySchedule</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Torneos de voleibol</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-sky-400/90">
            Portal de Administrador
          </p>
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 py-4">
        {adminNavSections.map((section) => {
          const items = adminNavItems.filter((item) => item.section === section.id);
          return (
            <div key={section.id}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:min-h-0 lg:py-2.5 ${
                        active
                          ? "bg-sky-600/20 text-white ring-1 ring-sky-500/40"
                          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      <NavIcon name={item.label} className="h-5 w-5 shrink-0 opacity-90" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <Link href="/" className="text-xs text-slate-500 transition-colors hover:text-slate-300">
          Ver sitio público →
        </Link>
      </div>
    </aside>
  );
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    Inicio:
      "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
    Torneos:
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5",
    "Torneos activos":
      "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z",
    Inscripciones:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    Equipos:
      "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    Perfiles:
      "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  };
  const d = paths[name] ?? paths.Inicio;
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}
