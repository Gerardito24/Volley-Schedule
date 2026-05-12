"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tournaments as seedTournaments, formatTournamentLocationsLine } from "@/lib/mock-data";
import type { TournamentMock } from "@/lib/mock-data";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import { readStoredTournaments } from "@/lib/local-tournaments";
import {
  getActiveLiveTournaments,
  localDateString,
} from "@/lib/tournament-active-window";

/* ─── helpers ─── */

function formatDateRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} — ${end}`;
}

/* ─── sub-components ─── */

function ActiveBanner({ tournament }: { tournament: TournamentMock }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-emerald-700 text-white shadow-lg">
      {tournament.promoImageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tournament.promoImageDataUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      ) : null}
      <div className="relative flex flex-col gap-4 p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Torneo en curso
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {tournament.name}
          </h2>
          <p className="mt-1.5 text-emerald-100">
            {formatDateRange(tournament.tournamentStartsOn, tournament.tournamentEndsOn)} ·{" "}
            {formatTournamentLocationsLine(tournament)}
          </p>
        </div>
        <Link
          href={`/tournaments/${tournament.slug}#itinerario`}
          className="shrink-0 self-start rounded-full bg-white px-7 py-3 text-sm font-bold text-emerald-800 shadow hover:bg-emerald-50 md:self-auto"
        >
          Ver itinerario →
        </Link>
      </div>
    </section>
  );
}

function TournamentCard({ t }: { t: TournamentMock }) {
  const open = t.status === "open";
  const hasBg = Boolean(t.promoImageDataUrl);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image / placeholder */}
      <div className="relative h-44 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {hasBg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.promoImageDataUrl!}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-300 dark:text-zinc-600 select-none">
            🏐
          </div>
        )}
        {/* Status badge */}
        <span
          className={[
            "absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            open
              ? "bg-emerald-100 text-emerald-800"
              : t.status === "closed"
                ? "bg-red-100 text-red-800"
                : "bg-zinc-200 text-zinc-600",
          ].join(" ")}
        >
          {open ? "Inscripciones abiertas" : t.status === "closed" ? "Cerrado" : "Borrador"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-bold text-zinc-900 leading-snug dark:text-zinc-50">{t.name}</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {formatDateRange(t.tournamentStartsOn, t.tournamentEndsOn)} ·{" "}
            {formatTournamentLocationsLine(t)}
          </p>
        </div>
        {t.description ? (
          <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t.description}
          </p>
        ) : null}

        <div className="mt-auto pt-2">
          {open ? (
            <Link
              href={`/tournaments/${t.slug}/register`}
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Inscribirse
            </Link>
          ) : (
            <Link
              href={`/tournaments/${t.slug}`}
              className="inline-flex w-full items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Ver torneo
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── page ─── */

export default function PublicHomePage() {
  const [all, setAll] = useState<TournamentMock[]>([]);

  useEffect(() => {
    setAll(mergeAdminTournaments(seedTournaments, readStoredTournaments()));
  }, []);

  const today = localDateString(new Date());

  const activeTournaments = useMemo(
    () => getActiveLiveTournaments(all, today),
    [all, today],
  );

  const cards = useMemo(
    () =>
      [...all]
        .filter((t) => t.status !== "draft")
        .sort((a, b) => {
          // Open first, then by start date desc
          if (a.status === "open" && b.status !== "open") return -1;
          if (b.status === "open" && a.status !== "open") return 1;
          return b.tournamentStartsOn.localeCompare(a.tournamentStartsOn);
        }),
    [all],
  );

  const featured = activeTournaments[0] ?? null;

  return (
    <main className="flex w-full flex-1 flex-col gap-10 py-10">

      {/* Active tournament banner */}
      {featured ? (
        <div className="space-y-2">
          <ActiveBanner tournament={featured} />
          {activeTournaments.length > 1 ? (
            <p className="text-right text-sm text-zinc-500">
              {activeTournaments.length - 1} torneo(s) más en curso —{" "}
              <Link href="/itinerarios" className="text-emerald-700 hover:underline dark:text-emerald-400">
                Ver itinerarios
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        /* Hero copy when no live tournament */
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Torneos de voleibol — Puerto Rico
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
            Inscripciones, itinerarios y más
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
            Un solo lugar para inscribir tu equipo, seguir el itinerario y mantenerte al día con
            todos los torneos.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/tournaments"
              className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Ver torneos abiertos
            </Link>
            <Link
              href="/itinerarios"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Itinerarios publicados
            </Link>
          </div>
        </section>
      )}

      {/* Tournament cards */}
      {cards.length > 0 ? (
        <section className="space-y-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Torneos</h2>
            <Link
              href="/tournaments"
              className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((t) => (
              <TournamentCard key={t.slug} t={t} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
