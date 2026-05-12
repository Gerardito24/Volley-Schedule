"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/tournaments", label: "Torneos" },
  { href: "/itinerarios", label: "Itinerario" },
  { href: "/equipo", label: "Equipo" },
];

function VolleyballIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="13" />
      <path d="M16 3 C16 3 10 9 10 16 C10 23 16 29 16 29" />
      <path d="M16 3 C16 3 22 9 22 16 C22 23 16 29 16 29" />
      <path d="M3 16 C3 16 9 10 16 10 C23 10 29 16 29 16" />
      <path d="M3 16 C3 16 9 22 16 22 C23 22 29 16 29 16" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/95">
      <div className="flex w-full flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">

        {/* Logo — centered, large */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-zinc-800 transition hover:text-emerald-700 dark:text-zinc-100 dark:hover:text-emerald-400"
        >
          <VolleyballIcon className="h-8 w-8 text-emerald-600 transition duration-300 group-hover:rotate-12 dark:text-emerald-400" />
          <span>VolleySchedule</span>
        </Link>

        {/* Nav pills — centered row */}
        <nav className="flex items-center gap-2">
          {NAV_LINKS.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/"
                : pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  "rounded-full px-6 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
                ].join(" ")}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
