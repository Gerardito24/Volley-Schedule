"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import { readStoredTournaments } from "@/lib/local-tournaments";
import type { TournamentMock } from "@/lib/mock-data";
import { tournaments as seedTournaments } from "@/lib/mock-data";
import { minEffectiveFeeCents } from "@/lib/tournament-pricing";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const statusLabel: Record<TournamentMock["status"], string> = {
  open: "Abierto",
  closed: "Cerrado",
  draft: "Borrador",
};

export default function AdminTournamentsPage() {
  const pathname = usePathname();
  const [merged, setMerged] = useState<TournamentMock[]>(() =>
    mergeAdminTournaments(seedTournaments, readStoredTournaments()),
  );

  useEffect(() => {
    setMerged(mergeAdminTournaments(seedTournaments, readStoredTournaments()));
  }, [pathname]);

  const sorted = useMemo(
    () =>
      [...merged].sort((a, b) =>
        a.tournamentStartsOn.localeCompare(b.tournamentStartsOn),
      ),
    [merged],
  );

  return (
    <main className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Torneos
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Lista demo + torneos guardados en este navegador (localStorage v2).
          </p>
        </div>
        <Link
          href="/admin/tournaments/new"
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Crear torneo
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {sorted.map((t) => {
          const minFee = minEffectiveFeeCents(t);
          const nCat = t.categories.length;
          return (
            <li key={t.slug}>
              <Link
                href={`/admin/tournaments/${encodeURIComponent(t.slug)}`}
                className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {t.name}
                  </h3>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {statusLabel[t.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {t.tournamentStartsOn} — {t.tournamentEndsOn} · {t.locationLabel}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Inscripciones hasta {t.registrationDeadlineOn}
                </p>
                <p className="mt-3 line-clamp-2 flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {t.description}
                </p>
                <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {minFee != null ? (
                    <>Desde {formatMoney(minFee)} · </>
                  ) : (
                    <>Tarifas por definir · </>
                  )}
                  {nCat} {nCat === 1 ? "categoría" : "categorías"}
                </p>
                <span className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Abrir panel →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
