"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/tournaments", label: "Torneos" },
  { href: "/itinerarios", label: "Itinerario" },
  { href: "/equipo", label: "Equipo" },
];

const ADMIN_HREF =
  typeof process.env.NEXT_PUBLIC_ADMIN_APP_URL === "string" &&
  process.env.NEXT_PUBLIC_ADMIN_APP_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_ADMIN_APP_URL.trim()
    : "/admin";

function ProfileAdminIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/95">
      <div className="relative flex w-full flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo — centered, large */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-zinc-800 transition hover:text-emerald-700 dark:text-zinc-100 dark:hover:text-emerald-400"
        >
          <Image
            src="/volleyschedule-logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain transition duration-300 group-hover:scale-105"
            priority
          />
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

        {/* Admin: absolute + último en el DOM para que quede por encima del logo centrado (evita solapamiento invisible) */}
        <Link
          href={ADMIN_HREF}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 sm:right-6 lg:right-8"
          aria-label="Ir a administración"
          title="Administración"
        >
          <ProfileAdminIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
