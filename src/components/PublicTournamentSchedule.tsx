"use client";

import { useEffect, useMemo, useState } from "react";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import { readStoredTournaments } from "@/lib/local-tournaments";
import type { TournamentMock } from "@/lib/mock-data";
import { tournaments as seedTournaments } from "@/lib/mock-data";
import { buildMatchOrderIndex, formatMatchSide } from "@/lib/schedule-display";
import type { CategoryScheduleMock } from "@/lib/schedule-types";

type Props = { slug: string };

function categoryScheduleRows(cs: CategoryScheduleMock) {
  const matchIndexById = buildMatchOrderIndex(
    cs.phases.flatMap((p) => p.matches),
  );
  const rows: {
    phase: string;
    round: number;
    label: string;
    starts?: string;
    court?: string;
  }[] = [];

  for (const ph of cs.phases) {
    const phaseLabel =
      ph.templateId === "pools_round_robin"
        ? "Pools (RR)"
        : ph.templateId === "pools_to_bracket"
          ? "Bracket"
          : ph.templateId === "single_elim"
            ? "Eliminatoria"
            : ph.templateId;

    for (const m of ph.matches) {
      const home = formatMatchSide(m.home, cs.teamLabels, matchIndexById);
      const away = formatMatchSide(m.away, cs.teamLabels, matchIndexById);
      const as = cs.assignments[m.id];
      rows.push({
        phase: phaseLabel,
        round: m.round + 1,
        label: `${home} vs ${away}`,
        starts: as?.startsAt,
        court: as?.courtLabel,
      });
    }
  }

  return rows;
}

export function PublicTournamentSchedule({ slug }: Props) {
  const [tournament, setTournament] = useState<TournamentMock | undefined>(
    undefined,
  );

  useEffect(() => {
    const merged = mergeAdminTournaments(seedTournaments, readStoredTournaments());
    setTournament(merged.find((t) => t.slug === slug));
  }, [slug]);

  const schedule = tournament?.schedule;

  const categoriesWithRows = useMemo(() => {
    if (!schedule?.published || !schedule.categorySchedules.length) return [];
    return schedule.categorySchedules.map((cs) => {
      const cat = tournament?.categories.find((c) => c.id === cs.categoryId);
      return {
        title: cat?.label ?? cs.categoryId,
        rows: categoryScheduleRows(cs),
      };
    });
  }, [schedule, tournament?.categories]);

  if (!schedule?.published || categoriesWithRows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Itinerario publicado
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Horarios y canchas según lo configurado por el organizador.
        </p>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {categoriesWithRows.map((block) => (
          <div key={block.title} className="px-4 py-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {block.title}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {block.rows.map((r, i) => (
                <li
                  key={`${r.label}-${i}`}
                  className="flex flex-wrap gap-x-3 gap-y-1 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
                >
                  <span className="text-zinc-500">
                    {r.starts
                      ? new Date(r.starts).toLocaleString("es-PR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "Horario por definir"}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {r.label}
                  </span>
                  {r.court ? (
                    <span className="text-zinc-500">· {r.court}</span>
                  ) : null}
                  <span className="text-xs text-zinc-400">
                    {r.phase} · R{r.round}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
