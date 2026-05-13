import type { CategoryScheduleMock } from "@/lib/schedule-types";
import {
  buildScheduleMatchViews,
  formatScheduleDateTime,
} from "@/components/admin/schedule-view-utils";

type Props = {
  schedule: CategoryScheduleMock | null | undefined;
  categoryLabel: string;
};

export function ScheduleBracketView({ schedule, categoryLabel }: Props) {
  if (!schedule) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Generá partidos para ver el bracket visual de esta categoría.
      </div>
    );
  }

  const rows = buildScheduleMatchViews(schedule, categoryLabel);
  const phases = schedule.phases.map((ph, idx) => ({
    id: ph.id,
    title:
      ph.templateId === "pools_round_robin"
        ? "Pools"
        : ph.templateId === "pools_to_bracket"
          ? "Bracket"
          : "Eliminación",
    idx,
    kind: ph.kind,
  }));

  return (
    <div className="space-y-5">
      {phases.map((phase) => {
        const phaseRows = rows.filter((r) => r.phaseIdx === phase.idx);
        const rounds = [...new Set(phaseRows.map((r) => r.round))].sort(
          (a, b) => a - b,
        );

        return (
          <div key={phase.id}>
            <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {phase.title}
            </h5>
            <div className="mt-3 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-4">
                {rounds.map((round) => {
                  const matches = phaseRows.filter((r) => r.round === round);
                  return (
                    <div key={`${phase.id}-${round}`} className="w-64 shrink-0">
                      <div className="mb-2 rounded-full bg-zinc-100 px-3 py-1 text-center text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        Ronda {round + 1}
                      </div>
                      <div className="space-y-3">
                        {matches.map((m) => (
                          <article
                            key={m.matchId}
                            className="rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                              Partido #{m.orderInRound + 1}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="rounded-lg bg-zinc-50 px-2 py-1 font-medium text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                                {m.home}
                              </p>
                              <p className="rounded-lg bg-zinc-50 px-2 py-1 font-medium text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                                {m.away}
                              </p>
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-zinc-500">
                              <p>{formatScheduleDateTime(m.assignment.startsAt)}</p>
                              <p>{m.assignment.courtLabel ?? "Cancha por definir"}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
