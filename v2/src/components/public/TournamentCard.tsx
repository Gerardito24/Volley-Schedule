import Link from "next/link";
import type { Tournament } from "@/lib/types";
import {
  TOURNAMENT_STATUS_LABELS,
  effectiveFeeCents,
  formatDateRangeEs,
  formatUsd,
  isTournamentLive,
} from "@/lib/types";

export function minFeeCents(t: Tournament): number | null {
  if (t.categories.length === 0) return t.baseFeeCents;
  return Math.min(...t.categories.map((c) => effectiveFeeCents(t, c)));
}

export function StatusChip({ tournament }: { tournament: Tournament }) {
  if (isTournamentLive(tournament) && tournament.schedule?.published) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold tracking-wide text-red-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        EN VIVO
      </span>
    );
  }
  if (tournament.status === "open") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
        {TOURNAMENT_STATUS_LABELS.open}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400">
      {TOURNAMENT_STATUS_LABELS[tournament.status]}
    </span>
  );
}

export default function TournamentCard({ tournament }: { tournament: Tournament }) {
  const fee = minFeeCents(tournament);
  const categoriesCount = tournament.categories.length;

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-zinc-100">
          <Link href={`/torneos/${tournament.slug}`} className="hover:text-amber-400">
            {tournament.name}
          </Link>
        </h3>
        <StatusChip tournament={tournament} />
      </div>

      <p className="mt-2 text-sm font-medium text-amber-400/90">
        {formatDateRangeEs(tournament.startsOn, tournament.endsOn)}
      </p>

      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
        {tournament.venues.map((v) => (
          <li key={v.id} className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 fill-zinc-500" aria-hidden="true">
              <path d="M10 2a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.8 6-10a6 6 0 0 0-6-6Zm0 8.2A2.2 2.2 0 1 1 10 5.8a2.2 2.2 0 0 1 0 4.4Z" />
            </svg>
            {v.label}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
        <span>
          {categoriesCount} {categoriesCount === 1 ? "categoría" : "categorías"}
        </span>
        {fee != null && (
          <span>
            Desde <span className="font-semibold text-zinc-200">{formatUsd(fee)}</span> por equipo
          </span>
        )}
      </div>

      <div className="mt-6 flex-1" />

      {tournament.status === "open" ? (
        <Link
          href={`/torneos/${tournament.slug}/inscribir`}
          className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
        >
          Inscribirse
        </Link>
      ) : (
        <Link
          href={`/torneos/${tournament.slug}`}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-amber-400 hover:text-amber-400"
        >
          Ver torneo
        </Link>
      )}
    </article>
  );
}
