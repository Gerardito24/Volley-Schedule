import Link from "next/link";
import { getTournaments } from "@/lib/store";
import { formatDateRangeEs, isTournamentLive } from "@/lib/types";
import TournamentCard from "@/components/public/TournamentCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tournaments = (await getTournaments()).filter((t) => t.status !== "draft");
  const live = tournaments.filter((t) => isTournamentLive(t) && t.schedule?.published);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      {/* Hero */}
      <section className="py-16 sm:py-24">
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
          El voleibol juvenil de Puerto Rico,{" "}
          <span className="text-amber-400">en un solo lugar</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-zinc-400">
          Encuentra los próximos torneos, inscribe a tu equipo en minutos y sigue los itinerarios
          y resultados en vivo, desde cualquier cancha de la isla.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/torneos"
            className="inline-flex items-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
          >
            Ver torneos
          </Link>
          <Link
            href="/itinerarios"
            className="inline-flex items-center rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-amber-400 hover:text-amber-400"
          >
            Itinerarios
          </Link>
        </div>
      </section>

      {/* En curso */}
      {live.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-red-400">
            En curso
          </h2>
          <div className="space-y-4">
            {live.map((t) => (
              <div
                key={t.slug}
                className="flex flex-col gap-5 rounded-2xl border border-red-500/30 bg-zinc-900 p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                    </span>
                    <span className="text-xs font-bold tracking-widest text-red-400">EN VIVO</span>
                  </div>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-100">
                    {t.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {t.venues.map((v) => v.label).join(" · ")} ·{" "}
                    {formatDateRangeEs(t.startsOn, t.endsOn)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/itinerarios#${t.slug}`}
                    className="inline-flex items-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
                  >
                    Ver itinerario
                  </Link>
                  <Link
                    href={`/torneos/${t.slug}`}
                    className="inline-flex items-center rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-amber-400 hover:text-amber-400"
                  >
                    Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Torneos */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100">Torneos</h2>
          <Link href="/torneos" className="text-sm font-medium text-amber-400 hover:text-amber-300">
            Ver todos →
          </Link>
        </div>
        {tournaments.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-400">
            Todavía no hay torneos publicados. Vuelve pronto.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <TournamentCard key={t.slug} tournament={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
