import Link from "next/link";
import type { Metadata } from "next";
import { getTournaments } from "@/lib/store";
import { formatDateRangeEs, isTournamentLive } from "@/lib/types";
import ScheduleView from "@/components/public/ScheduleView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Itinerarios" };

export default async function ItinerariosPage() {
  const tournaments = (await getTournaments()).filter(
    (t) =>
      t.status !== "draft" &&
      t.schedule?.published &&
      t.schedule.categories.some((c) => c.matches.length > 0),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <header className="py-12 sm:py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
          Itinerarios
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Horarios, canchas y resultados de todos los torneos con itinerario publicado.
        </p>
      </header>

      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-lg font-semibold text-zinc-200">
            Todavía no hay itinerarios publicados.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Cuando un torneo publique su itinerario aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {tournaments.map((t) => (
            <section key={t.slug} id={t.slug} className="scroll-mt-20">
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-zinc-100">
                    {t.name}
                    {isTournamentLive(t) && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold tracking-wide text-red-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                        EN VIVO
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {formatDateRangeEs(t.startsOn, t.endsOn)} ·{" "}
                    {t.venues.map((v) => v.label).join(" · ")}
                  </p>
                </div>
                <Link
                  href={`/torneos/${t.slug}`}
                  className="text-sm font-medium text-amber-400 hover:text-amber-300"
                >
                  Ver torneo →
                </Link>
              </div>
              <ScheduleView tournament={t} categories={t.schedule?.categories ?? []} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
