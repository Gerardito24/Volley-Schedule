import Link from "next/link";
import type { TournamentMock } from "@/lib/mock-data";
import { formatTournamentLocationsLine } from "@/lib/mock-data";
import { minEffectiveFeeCents } from "@/lib/tournament-pricing";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDateRange(start: string, end: string) {
  return start === end ? start : `${start} – ${end}`;
}

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
        <path d="M32 6 C32 6 20 18 20 32 C20 46 32 58 32 58" />
        <path d="M32 6 C32 6 44 18 44 32 C44 46 32 58 32 58" />
        <path d="M6 32 C6 32 18 20 32 20 C46 20 58 32 58 32" />
        <path d="M6 32 C6 32 18 44 32 44 C46 44 58 32 58 32" />
      </svg>
    </div>
  );
}

export function TournamentCard({ tournament }: { tournament: TournamentMock }) {
  const open = tournament.status === "open";
  const minFee = minEffectiveFeeCents(tournament);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-transparent transition duration-200 hover:shadow-md hover:ring-2 hover:ring-emerald-400/50 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image / placeholder */}
      <div className="relative h-52 overflow-hidden">
        {tournament.promoImageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.promoImageDataUrl}
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
              : tournament.status === "closed"
                ? "bg-red-100/90 text-red-800"
                : "bg-zinc-200/90 text-zinc-600",
          ].join(" ")}
        >
          {open
            ? "Inscripciones abiertas"
            : tournament.status === "closed"
              ? "Cerrado"
              : "Borrador"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-50">
          {tournament.name}
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatDateRange(tournament.tournamentStartsOn, tournament.tournamentEndsOn)}
          {" · "}
          {formatTournamentLocationsLine(tournament)}
        </p>
        {tournament.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {tournament.description}
          </p>
        ) : null}
        {minFee != null ? (
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Desde {formatMoney(minFee)}
            {tournament.publicEntryFeeCents != null
              ? ` · Público ${formatMoney(tournament.publicEntryFeeCents)}`
              : ""}
          </p>
        ) : null}

        <div className="mt-auto flex gap-2 pt-3">
          <Link
            href={`/tournaments/${tournament.slug}`}
            className="flex flex-1 items-center justify-center rounded-full border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
          >
            Ver detalle
          </Link>
          {open ? (
            <Link
              href={`/tournaments/${tournament.slug}/register`}
              className="flex flex-1 items-center justify-center rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
            >
              Inscribirse
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
