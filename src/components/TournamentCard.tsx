import Link from "next/link";
import type { TournamentMock } from "@/lib/mock-data";
import { minEffectiveFeeCents } from "@/lib/tournament-pricing";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function TournamentCard({ tournament }: { tournament: TournamentMock }) {
  const open = tournament.status === "open";
  const minFee = minEffectiveFeeCents(tournament);

  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {tournament.name}
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {tournament.tournamentStartsOn} — {tournament.tournamentEndsOn} ·{" "}
        {tournament.locationLabel}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Inscripciones hasta {tournament.registrationDeadlineOn}
      </p>
      <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
        {tournament.description}
      </p>
      <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {minFee != null ? (
          <>Desde {formatMoney(minFee)}</>
        ) : (
          <>Consultar tarifas</>
        )}
        {tournament.publicEntryFeeCents != null ? (
          <> · Público {formatMoney(tournament.publicEntryFeeCents)}</>
        ) : null}
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
        >
          Ver detalle
        </Link>
        {open ? (
          <Link
            href={`/tournaments/${tournament.slug}/register`}
            className="rounded-full bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
          >
            Inscribirse
          </Link>
        ) : (
          <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Cerrado
          </span>
        )}
      </div>
    </article>
  );
}
