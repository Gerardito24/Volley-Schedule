"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { TournamentSchedulePanel } from "@/components/admin/TournamentSchedulePanel";
import {
  readStoredTournaments,
  VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED,
} from "@/lib/local-tournaments";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import type { TournamentMock } from "@/lib/mock-data";
import {
  formatTournamentLocationsLine,
  tournaments as seedTournaments,
} from "@/lib/mock-data";

function AdminTournamentScheduleInner() {
  const params = useParams();
  const slugParam = params.slug;
  const slug =
    typeof slugParam === "string"
      ? decodeURIComponent(slugParam)
      : Array.isArray(slugParam)
        ? decodeURIComponent(slugParam[0] ?? "")
        : "";

  const [merged, setMerged] = useState<TournamentMock[]>(() =>
    mergeAdminTournaments(seedTournaments, readStoredTournaments()),
  );

  const refreshMerged = useCallback(() => {
    setMerged(mergeAdminTournaments(seedTournaments, readStoredTournaments()));
  }, []);

  useEffect(() => {
    refreshMerged();
    window.addEventListener(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED, refreshMerged);
    return () =>
      window.removeEventListener(
        VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED,
        refreshMerged,
      );
  }, [slug, refreshMerged]);

  const tournament = useMemo(
    () => merged.find((t) => t.slug === slug),
    [merged, slug],
  );

  if (!tournament) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Torneo no encontrado
        </h2>
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Volver a torneos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/admin/tournaments/${encodeURIComponent(slug)}`}
            className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            ← Volver al torneo
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Itinerario visual
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {tournament.name} · {formatTournamentLocationsLine(tournament)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {tournament.schedule?.published ? "Publicado" : "No publicado"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {tournament.schedule?.categorySchedules.length ?? 0} categorías con
            itinerario
          </p>
        </div>
      </div>

      <TournamentSchedulePanel
        tournament={tournament}
        onScheduleSaved={refreshMerged}
        workspace
      />
    </main>
  );
}

export default function AdminTournamentSchedulePage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cargando…
          </p>
        </main>
      }
    >
      <AdminTournamentScheduleInner />
    </Suspense>
  );
}
