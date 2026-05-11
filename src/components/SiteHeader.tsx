import Link from "next/link";

const links = [
  { href: "/tournaments", label: "Torneos (equipos)" },
  { href: "/admin", label: "Panel organizador" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          VolleySchedule · Sitio público
        </Link>
        <nav className="flex gap-6 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://www.volleyschedule.com/"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            target="_blank"
            rel="noopener noreferrer"
          >
            Itinerarios
          </a>
        </nav>
      </div>
    </header>
  );
}
