import Link from "next/link";
import { getTournaments } from "@/lib/store";
import { formatDateRangeEs, isTournamentLive } from "@/lib/types";
import { btnPrimary, card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Torneos activos" };

export default async function ActiveTournamentsPage() {
  const tournaments = await getTournaments();
  const active = tournaments.filter((t) => isTournamentLive(t) && t.schedule?.published);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Torneos activos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Torneos en curso con itinerario publicado, listos para anotar resultados.
        </p>
      </div>

      {active.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="font-medium text-zinc-900">No hay torneos activos hoy.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Cuando un torneo con itinerario publicado esté en curso aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((t) => (
            <div key={t.slug} className={`${card} p-6`}>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  En vivo
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900">{t.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {formatDateRangeEs(t.startsOn, t.endsOn)}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {t.venues.length === 0
                  ? "Sede por confirmar"
                  : t.venues.map((v) => v.label).join(" · ")}
              </p>
              <div className="mt-5">
                <Link href={`/admin/torneos/${t.slug}/itinerario`} className={btnPrimary}>
                  Anotar resultados
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
