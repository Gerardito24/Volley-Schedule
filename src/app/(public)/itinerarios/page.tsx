"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import { readStoredTournaments } from "@/lib/local-tournaments";
import { tournaments as seedTournaments, formatTournamentLocationsLine } from "@/lib/mock-data";
import type { TournamentMock } from "@/lib/mock-data";
import { buildMatchOrderIndex, formatMatchSide } from "@/lib/schedule-display";
import type { CategoryScheduleMock } from "@/lib/schedule-types";

function categoryRows(cs: CategoryScheduleMock) {
  const indexById = buildMatchOrderIndex(cs.phases.flatMap((p) => p.matches));
  const rows: { phase: string; label: string; starts?: string; court?: string }[] = [];
  for (const ph of cs.phases) {
    const phLabel =
      ph.templateId === "pools_round_robin"
        ? "Pools"
        : ph.templateId === "pools_to_bracket" || ph.templateId === "single_elim"
          ? "Bracket"
          : ph.templateId;
    for (const m of ph.matches) {
      const home = formatMatchSide(m.home, cs.teamLabels, indexById);
      const away = formatMatchSide(m.away, cs.teamLabels, indexById);
      const as = cs.assignments[m.id];
      rows.push({ phase: phLabel, label: `${home} vs ${away}`, starts: as?.startsAt, court: as?.courtLabel });
    }
  }
  return rows;
}

export default function ItinerariosPage() {
  const [all, setAll] = useState<TournamentMock[]>([]);

  useEffect(() => {
    setAll(mergeAdminTournaments(seedTournaments, readStoredTournaments()));
  }, []);

  const published = useMemo(
    () =>
      all
        .filter((t) => !t.hiddenFromPublic)
        .filter((t) => {
          const s = t.schedule;
          return s?.published && s.categorySchedules.some((cs) => cs.phases.some((p) => p.matches.length > 0));
        }),
    [all],
  );

  return (
    <main className="flex w-full flex-1 flex-col gap-8 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Itinerarios
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Torneos con itinerario publicado por el organizador.
        </p>
      </div>

      {published.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">
            No hay itinerarios publicados en este momento.
          </p>
          <Link
            href="/tournaments"
            className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Ver torneos disponibles →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {published.map((t) => {
            const cats = t.schedule!.categorySchedules;
            return (
              <section
                key={t.slug}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 bg-emerald-50 px-6 py-4 dark:border-zinc-800 dark:bg-emerald-950/30">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {t.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {t.tournamentStartsOn} — {t.tournamentEndsOn} ·{" "}
                      {formatTournamentLocationsLine(t)}
                    </p>
                  </div>
                  <Link
                    href={`/tournaments/${t.slug}#itinerario`}
                    className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Ver itinerario completo →
                  </Link>
                </div>

                {/* Categories */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {cats.map((cs) => {
                    const cat = t.categories.find((c) => c.id === cs.categoryId);
                    const rows = categoryRows(cs).slice(0, 6);
                    const total = categoryRows(cs).length;
                    return (
                      <div key={cs.categoryId} className="px-6 py-4">
                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {cat?.label ?? cs.categoryId}
                        </h3>
                        <ul className="mt-3 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                          {rows.map((r, i) => (
                            <li
                              key={i}
                              className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
                            >
                              <span className="font-medium text-zinc-400 dark:text-zinc-500 w-20 shrink-0">
                                {r.phase}
                              </span>
                              <span>{r.label}</span>
                              {r.starts ? (
                                <span className="text-zinc-500 text-xs">
                                  {r.starts}
                                </span>
                              ) : null}
                              {r.court ? (
                                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  {r.court}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        {total > 6 ? (
                          <Link
                            href={`/tournaments/${t.slug}#itinerario`}
                            className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            +{total - 6} partidos más →
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
