import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTournament } from "@/lib/store";
import {
  categoryLabel,
  effectiveFeeCents,
  formatDateEs,
  formatDateRangeEs,
  formatUsd,
} from "@/lib/types";
import { StatusChip } from "@/components/public/TournamentCard";
import ScheduleView from "@/components/public/ScheduleView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  return { title: tournament && tournament.status !== "draft" ? tournament.name : "Torneo" };
}

export default async function TorneoDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament || tournament.status === "draft") notFound();

  const isOpen = tournament.status === "open";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      {/* Hero */}
      <header className="py-12 sm:py-16">
        {tournament.promoImageDataUrl ? (
          <div className="mb-8 overflow-hidden rounded-3xl border border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tournament.promoImageDataUrl}
              alt={tournament.name}
              className="h-56 w-full object-cover sm:h-80"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip tournament={tournament} />
          <span className="text-sm font-medium text-amber-400/90">
            {formatDateRangeEs(tournament.startsOn, tournament.endsOn)}
          </span>
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
          {tournament.name}
        </h1>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <dt className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Inscripciones hasta
            </dt>
            <dd className="mt-1 text-lg font-bold text-zinc-100">
              {formatDateEs(tournament.registrationDeadlineOn)}
            </dd>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <dt className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {tournament.venues.length === 1 ? "Sede" : "Sedes"}
            </dt>
            <dd className="mt-1 space-y-0.5">
              {tournament.venues.map((v) => (
                <p key={v.id} className="text-sm font-semibold text-zinc-100">
                  {v.label}{" "}
                  <span className="font-normal text-zinc-400">
                    · {v.courtCount} {v.courtCount === 1 ? "cancha" : "canchas"}
                  </span>
                </p>
              ))}
            </dd>
          </div>
          {tournament.publicEntryFeeCents != null && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <dt className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Entrada al público
              </dt>
              <dd className="mt-1 text-lg font-bold text-zinc-100">
                {formatUsd(tournament.publicEntryFeeCents)}
              </dd>
            </div>
          )}
        </dl>
      </header>

      {/* Descripción */}
      {tournament.description && (
        <section className="mb-12">
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-zinc-100">
            Sobre el torneo
          </h2>
          <p className="max-w-3xl whitespace-pre-line text-zinc-400">{tournament.description}</p>
        </section>
      )}

      {/* Categorías y tarifas */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-100">
          Categorías y tarifas
        </h2>
        {tournament.categories.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
            Las categorías de este torneo aún no se han anunciado.
          </p>
        ) : (
          <div className="overflow-x-auto thin-scroll rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3 font-semibold">Categoría</th>
                  <th className="px-5 py-3 font-semibold">Tarifa por equipo</th>
                  <th className="px-5 py-3 font-semibold">Cupo</th>
                </tr>
              </thead>
              <tbody>
                {tournament.categories.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-800/60 bg-zinc-900 last:border-0">
                    <td className="px-5 py-3.5 font-semibold text-zinc-100">
                      {categoryLabel(tournament, c)}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-amber-400">
                      {formatUsd(effectiveFeeCents(tournament, c))}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400">
                      {c.maxTeams != null ? `Cupo: ${c.maxTeams} equipos` : "Sin límite"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CTA inscripción */}
      {isOpen && (
        <section className="mb-12 rounded-2xl border border-amber-400/30 bg-zinc-900 p-8 text-center sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
            ¿Listos para competir?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-zinc-400">
            Las inscripciones están abiertas hasta el{" "}
            {formatDateEs(tournament.registrationDeadlineOn)}. Completa el formulario en línea en
            minutos.
          </p>
          <Link
            href={`/torneos/${tournament.slug}/inscribir`}
            className="mt-6 inline-flex items-center rounded-xl bg-amber-400 px-8 py-3.5 text-base font-semibold text-zinc-950 transition hover:bg-amber-300"
          >
            Inscribir mi equipo
          </Link>
        </section>
      )}

      {/* Itinerario */}
      <section id="itinerario" className="scroll-mt-20">
        <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-100">Itinerario</h2>
        {tournament.schedule?.published ? (
          <ScheduleView tournament={tournament} categories={tournament.schedule.categories} />
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-lg font-semibold text-zinc-200">Itinerario en preparación</p>
            <p className="mt-2 text-sm text-zinc-400">
              El itinerario aún no se ha publicado. Vuelve pronto.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
