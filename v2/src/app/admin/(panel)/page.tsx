import Link from "next/link";
import { getSessionAdmin } from "@/lib/auth";
import { getClients, getClubs, getRegistrations, getTournaments } from "@/lib/store";
import {
  categoryLabel,
  formatDateRangeEs,
  isTournamentLive,
} from "@/lib/types";
import { ApprovalStatusChip, PaymentStatusChip } from "@/components/admin/StatusChip";
import { btnPrimary, card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await getSessionAdmin();
  const [tournaments, registrations, clubs, clients] = await Promise.all([
    getTournaments(),
    getRegistrations(),
    getClubs(),
    getClients(),
  ]);

  const tournamentBySlug = new Map(tournaments.map((t) => [t.slug, t]));
  const openTournaments = tournaments.filter((t) => t.status === "open").length;
  const live = tournaments.filter((t) => isTournamentLive(t) && t.schedule?.published);

  const needsAction = registrations
    .filter((r) => r.approval === "pending" || r.paymentStatus === "unpaid")
    .filter((r) => r.approval !== "rejected")
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));

  const recent = [...registrations]
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .slice(0, 6);

  const metrics = [
    { label: "Torneos abiertos", value: String(openTournaments), href: "/admin/torneos" },
    {
      label: "Requieren acción",
      value: String(needsAction.length),
      href: "/admin/inscripciones",
      highlight: needsAction.length > 0,
    },
    { label: "Clubes", value: String(clubs.length), href: "/admin/equipos" },
    { label: "Clientes", value: String(clients.length), href: "/admin/clientes" },
  ];

  function describe(regId: string): {
    teamLine: string;
    catLine: string;
  } {
    const r = registrations.find((x) => x.id === regId)!;
    const t = tournamentBySlug.get(r.tournamentSlug);
    const cat = t?.categories.find((c) => c.id === r.categoryId);
    return {
      teamLine: `${r.teamName} — ${r.clubName}`,
      catLine: `${t?.name ?? r.tournamentSlug}${t && cat ? ` · ${categoryLabel(t, cat)}` : ""}`,
    };
  }

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

      {/* En vivo ahora */}
      {live.length > 0 ? (
        <div className="space-y-3">
          {live.map((t) => (
            <div
              key={t.slug}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                </span>
                <div>
                  <p className="font-semibold text-zinc-900">{t.name}</p>
                  <p className="text-xs text-zinc-500">
                    En curso · {formatDateRangeEs(t.startsOn, t.endsOn)}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/torneos/${t.slug}/itinerario`}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Anotar resultados
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className={`${card} p-4 transition-colors hover:border-indigo-300 ${
              m.highlight ? "border-amber-300 bg-amber-50" : ""
            }`}
          >
            <p
              className={`text-2xl font-semibold ${
                m.highlight ? "text-amber-700" : "text-zinc-900"
              }`}
            >
              {m.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{m.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Requieren acción */}
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Requieren acción</h2>
            <Link
              href="/admin/inscripciones"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          {needsAction.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">
              ✓ Nada pendiente — todas las inscripciones están al día.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {needsAction.slice(0, 6).map((r) => {
                const d = describe(r.id);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/inscripciones/${r.id}`}
                      className="group flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 group-hover:text-indigo-600">
                          {d.teamLine}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{d.catLine}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.approval === "pending" ? (
                          <ApprovalStatusChip status={r.approval} />
                        ) : null}
                        {r.paymentStatus === "unpaid" ? (
                          <PaymentStatusChip status={r.paymentStatus} />
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Inscripciones recientes */}
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Inscripciones recientes</h2>
            <Link
              href="/admin/inscripciones"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">
              Aún no hay inscripciones.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recent.map((r) => {
                const d = describe(r.id);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/inscripciones/${r.id}`}
                      className="group flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 group-hover:text-indigo-600">
                          {d.teamLine}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{d.catLine}</p>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {new Date(r.registeredAt).toLocaleDateString("es-PR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
