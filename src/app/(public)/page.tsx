"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  formatTournamentLocationsLine,
} from "@/lib/mock-data";
import type { TournamentMock } from "@/lib/mock-data";
import { useMergedTournaments } from "@/hooks/use-merged-tournaments";
import {
  getActiveLiveTournaments,
  localDateString,
} from "@/lib/tournament-active-window";

/* ─── helpers ─── */

function formatDateRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} – ${end}`;
}

/* ─── Volleyball placeholder SVG ─── */
function VolleyballPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-zinc-100 dark:from-emerald-950/30 dark:to-zinc-900">
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 text-emerald-300 dark:text-emerald-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="26" />
        {/* vertical seam */}
        <path d="M32 6 C32 6 20 18 20 32 C20 46 32 58 32 58" />
        <path d="M32 6 C32 6 44 18 44 32 C44 46 32 58 32 58" />
        {/* horizontal seam */}
        <path d="M6 32 C6 32 18 20 32 20 C46 20 58 32 58 32" />
        <path d="M6 32 C6 32 18 44 32 44 C46 44 58 32 58 32" />
      </svg>
    </div>
  );
}

/* ─── Active tournament banner ─── */
function ActiveBanner({ tournament }: { tournament: TournamentMock }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-zinc-900 text-white shadow-xl">
      {/* Promo image with gradient overlay */}
      {tournament.promoImageDataUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tournament.promoImageDataUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/40 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-zinc-900 opacity-90" />
      )}

      <div className="relative flex flex-col gap-5 px-6 py-8 sm:px-10 sm:py-10 md:flex-row md:items-end md:justify-between">
        <div>
          {/* Live pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En curso
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            {tournament.name}
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            {formatDateRange(tournament.tournamentStartsOn, tournament.tournamentEndsOn)}
            {" · "}
            {formatTournamentLocationsLine(tournament)}
          </p>
        </div>
        <Link
          href={`/tournaments/${tournament.slug}#itinerario`}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center self-start rounded-full bg-white px-6 py-3 text-sm font-bold text-zinc-900 shadow-lg transition hover:bg-emerald-50 sm:px-8 md:self-auto"
        >
          Ver itinerario →
        </Link>
      </div>
    </section>
  );
}

/* ─── Tournament card ─── */
function TournamentCard({ t }: { t: TournamentMock }) {
  const open = t.status === "open";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-transparent transition duration-200 hover:shadow-md hover:ring-2 hover:ring-emerald-400/50 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image / placeholder */}
      <div className="relative h-52 overflow-hidden">
        {t.promoImageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.promoImageDataUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <VolleyballPlaceholder />
        )}
        {/* Status badge */}
        <span
          className={[
            "absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm",
            open
              ? "bg-emerald-100/90 text-emerald-800"
              : t.status === "closed"
                ? "bg-red-100/90 text-red-800"
                : "bg-zinc-200/90 text-zinc-600",
          ].join(" ")}
        >
          {open ? "Inscripciones abiertas" : t.status === "closed" ? "Cerrado" : "Borrador"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-50">
          {t.name}
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatDateRange(t.tournamentStartsOn, t.tournamentEndsOn)}
          {" · "}
          {formatTournamentLocationsLine(t)}
        </p>
        {t.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t.description}
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          {open ? (
            <Link
              href={`/tournaments/${t.slug}/register`}
              className="flex min-h-[44px] w-full items-center justify-center rounded-full bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
            >
              Inscribirse
            </Link>
          ) : (
            <Link
              href={`/tournaments/${t.slug}`}
              className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-zinc-300 px-3 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
            >
              Ver torneo
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── Page ─── */
export default function PublicHomePage() {
  const all = useMergedTournaments();

  const today = localDateString(new Date());

  const publicAll = useMemo(() => all.filter((t) => !t.hiddenFromPublic), [all]);

  const activeTournaments = useMemo(
    () => getActiveLiveTournaments(publicAll, today),
    [publicAll, today],
  );

  const cards = useMemo(
    () =>
      [...publicAll]
        .filter((t) => t.status !== "draft")
        .sort((a, b) => {
          if (a.status === "open" && b.status !== "open") return -1;
          if (b.status === "open" && a.status !== "open") return 1;
          return b.tournamentStartsOn.localeCompare(a.tournamentStartsOn);
        }),
    [publicAll],
  );

  const featured = activeTournaments[0] ?? null;

  return (
    <main className="flex w-full flex-1 flex-col gap-10 py-10">
      {/* Active tournament banner — only shown when there is a live tournament with published schedule */}
      {featured ? (
        <div className="space-y-2">
          <ActiveBanner tournament={featured} />
          {activeTournaments.length > 1 ? (
            <p className="text-right text-xs text-zinc-500">
              {activeTournaments.length - 1} torneo(s) más en curso —{" "}
              <Link
                href="/itinerarios"
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Ver itinerarios
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Tournament cards grid */}
      {cards.length > 0 ? (
        <section className="space-y-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Torneos
            </h2>
            <Link
              href="/tournaments"
              className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
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
      ) : (
        !featured && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay torneos disponibles en este momento.
          </p>
        )
      )}
    </main>
  );
}
