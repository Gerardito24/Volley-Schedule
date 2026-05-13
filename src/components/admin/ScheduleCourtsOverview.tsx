import { useCallback } from "react";
import type { TournamentMock } from "@/lib/mock-data";
import {
  flattenTournamentCourts,
  resolveCourtIdFromAssignment,
} from "@/lib/tournament-courts";
import {
  buildScheduleMatchViews,
  formatScheduleDateTime,
} from "@/components/admin/schedule-view-utils";
import { useDoubleTap } from "@/hooks/use-double-tap";
import type { ScheduleMatchView } from "@/components/admin/schedule-view-utils";

type Props = {
  tournament: TournamentMock;
  onMatchRequestEdit?: (matchId: string, categoryId: string) => void;
};

function CourtMatchRow({
  m,
  onMatchRequestEdit,
}: {
  m: ScheduleMatchView & { courtId: string | null; startsAt?: string };
  onMatchRequestEdit?: (matchId: string, categoryId: string) => void;
}) {
  const fire = useCallback(() => {
    onMatchRequestEdit?.(m.matchId, m.categoryId);
  }, [m.matchId, m.categoryId, onMatchRequestEdit]);

  const tap = useDoubleTap(fire, 320);

  return (
    <li
      className={`rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-950/50 ${
        onMatchRequestEdit ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900" : ""
      }`}
      onDoubleClick={onMatchRequestEdit ? fire : undefined}
      onTouchStart={onMatchRequestEdit ? tap.onTouchStart : undefined}
      onTouchMove={onMatchRequestEdit ? tap.onTouchMove : undefined}
      onTouchEnd={onMatchRequestEdit ? tap.onTouchEnd : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{m.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{formatScheduleDateTime(m.startsAt)}</span>
          {onMatchRequestEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fire();
              }}
              className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-zinc-600 dark:text-emerald-400"
            >
              Editar
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {m.categoryLabel} · {m.phaseTitle} · Ronda {m.round + 1}
      </p>
    </li>
  );
}

export function ScheduleCourtsOverview({ tournament, onMatchRequestEdit }: Props) {
  const courts = flattenTournamentCourts(tournament.venues);
  const schedules = tournament.schedule?.categorySchedules ?? [];

  if (courts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Definí canchas por sede para ver la ocupación visual por cancha.
      </div>
    );
  }

  const rows = schedules.flatMap((cs) => {
    const category =
      tournament.categories.find((c) => c.id === cs.categoryId)?.label ??
      cs.categoryId;
    return buildScheduleMatchViews(cs, category).map((view) => ({
      ...view,
      courtId: resolveCourtIdFromAssignment(view.assignment, courts),
      startsAt: view.assignment.startsAt,
    }));
  });

  return (
    <div className="space-y-3">
      {courts.map((court) => {
        const matches = rows
          .filter((r) => r.courtId === court.id)
          .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
        return (
          <details
            key={court.id}
            className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            open={matches.length > 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {court.label}
                </span>
                <span className="text-xs text-zinc-500">
                  {matches.length} partido{matches.length === 1 ? "" : "s"}
                </span>
              </span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Ver horario
              </span>
            </summary>
            <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
              {matches.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin partidos asignados.</p>
              ) : (
                <ul className="space-y-2">
                  {matches.map((m) => (
                    <CourtMatchRow key={`${m.categoryId}-${m.matchId}`} m={m} onMatchRequestEdit={onMatchRequestEdit} />
                  ))}
                </ul>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
