"use client";

import { useMemo } from "react";
import Link from "next/link";
import { TournamentCard } from "@/components/TournamentCard";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { useMergedTournaments } from "@/hooks/use-merged-tournaments";

export default function TournamentsPage() {
  const all = useMergedTournaments();

  const publicTournaments = useMemo(
    () =>
      [...all]
        .filter((t) => !t.hiddenFromPublic)
        .filter((t) => t.status !== "draft")
        .sort((a, b) => {
          if (a.status === "open" && b.status !== "open") return -1;
          if (b.status === "open" && a.status !== "open") return 1;
          return b.tournamentStartsOn.localeCompare(a.tournamentStartsOn);
        }),
    [all],
  );

  return (
    <main className="flex w-full flex-1 flex-col gap-8 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Torneos
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Inscripciones y detalles de cada evento.
        </p>
      </div>
      <div className="mx-auto w-full max-w-5xl">
        {publicTournaments.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicTournaments.map((t) => (
              <TournamentCard key={t.slug} tournament={t} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No hay torneos disponibles"
            description="Vuelve pronto — el organizador publicará nuevos eventos aquí."
            action={
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Volver al inicio
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
