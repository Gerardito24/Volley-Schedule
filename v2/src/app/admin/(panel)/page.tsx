import Link from "next/link";
import { getSessionAdmin } from "@/lib/auth";
import { getClubs, getRegistrations, getTournaments } from "@/lib/store";
import { isTournamentLive } from "@/lib/types";
import { btnPrimary, card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const MODULES = [
  {
    href: "/admin/torneos",
    title: "Torneos",
    description: "Crea y configura torneos, divisiones, categorías y tarifas.",
  },
  {
    href: "/admin/torneos-activos",
    title: "Torneos activos",
    description: "Sigue los torneos en curso y anota resultados en vivo.",
  },
  {
    href: "/admin/inscripciones",
    title: "Inscripciones",
    description: "Revisa, aprueba y administra las inscripciones de equipos.",
  },
  {
    href: "/admin/equipos",
    title: "Equipos",
    description: "Perfiles de clubes y rosters guardados para reutilizar.",
  },
];

export default async function AdminDashboardPage() {
  const admin = await getSessionAdmin();
  const [tournaments, registrations, clubs] = await Promise.all([
    getTournaments(),
    getRegistrations(),
    getClubs(),
  ]);

  const openTournaments = tournaments.filter((t) => t.status === "open").length;
  const pendingPayments = registrations.filter((r) => r.status === "pending_payment").length;
  const liveToday = tournaments.filter(
    (t) => isTournamentLive(t) && t.schedule?.published,
  ).length;

  const metrics = [
    { label: "Torneos abiertos", value: openTournaments },
    { label: "Pagos pendientes", value: pendingPayments },
    { label: "En curso hoy", value: liveToday },
    { label: "Equipos guardados", value: clubs.length },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Hola, {admin?.displayName ?? "Administrador"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Resumen general de la operación de VolleyHub PR.
          </p>
        </div>
        <Link href="/admin/torneos/nuevo" className={btnPrimary}>
          Crear torneo
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={`${card} p-5`}>
            <p className="text-3xl font-semibold text-zinc-900">{m.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{m.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Módulos
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {MODULES.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={`${card} group p-5 transition-colors hover:border-indigo-300`}
            >
              <p className="font-medium text-zinc-900 group-hover:text-indigo-600">
                {mod.title}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{mod.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
