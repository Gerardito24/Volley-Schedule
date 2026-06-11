import Link from "next/link";
import { getSessionClient } from "@/lib/client-auth";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/torneos", label: "Torneos" },
  { href: "/itinerarios", label: "Itinerarios" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#fbbf24" />
        <path
          d="M12 2a10 10 0 0 0-7 17.1M12 2a10 10 0 0 1 7 17.1M12 2v20"
          fill="none"
          stroke="#18181b"
          strokeWidth="1.4"
        />
      </svg>
      <span className="text-lg font-extrabold tracking-tight text-zinc-100">
        VolleyHub <span className="text-amber-400">PR</span>
      </span>
    </Link>
  );
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const client = await getSessionClient();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Logo />
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
              >
                {link.label}
              </Link>
            ))}
            {client ? (
              <Link
                href="/cuenta"
                className="ml-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-400 border border-amber-400/30 transition hover:bg-amber-400/10"
              >
                {client.displayName.split(" ")[0]}
              </Link>
            ) : (
              <Link
                href="/cuenta/login"
                className="ml-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-100 border border-zinc-700 transition hover:bg-zinc-800"
              >
                Mi cuenta
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row">
          <p>
            <span className="font-semibold text-zinc-300">VolleyHub PR</span> — Voleibol juvenil
            de Puerto Rico
          </p>
          <Link href="/admin" className="text-xs text-zinc-600 transition hover:text-amber-400">
            Portal de Administrador
          </Link>
        </div>
      </footer>
    </div>
  );
}
