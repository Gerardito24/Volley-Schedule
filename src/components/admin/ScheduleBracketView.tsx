"use client";

import { useCallback } from "react";
import {
  buildScheduleMatchViews,
  formatScheduleDateTime,
} from "@/components/admin/schedule-view-utils";
import { useDoubleTap } from "@/hooks/use-double-tap";
import type { CategoryScheduleMock } from "@/lib/schedule-types";

type MatchRow = ReturnType<typeof buildScheduleMatchViews>[number];

function BracketMatchCard({
  m,
  compact,
  onRequestEdit,
}: {
  m: MatchRow;
  compact: boolean;
  onRequestEdit?: (matchId: string) => void;
}) {
  const fire = useCallback(() => {
    onRequestEdit?.(m.matchId);
  }, [m.matchId, onRequestEdit]);

  const tap = useDoubleTap(fire, 320);

  const pad = compact ? "p-2.5" : "p-3";
  const textMain = compact ? "text-xs" : "text-sm";

  return (
    <article
      className={`rounded-xl border border-zinc-200 bg-white ${pad} ${textMain} shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
        onRequestEdit ? "cursor-pointer hover:border-emerald-400/60" : ""
      }`}
      onDoubleClick={onRequestEdit ? fire : undefined}
      onTouchStart={onRequestEdit ? tap.onTouchStart : undefined}
      onTouchMove={onRequestEdit ? tap.onTouchMove : undefined}
      onTouchEnd={onRequestEdit ? tap.onTouchEnd : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          Partido #{m.orderInRound + 1}
        </p>
        {onRequestEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fire();
            }}
            className="shrink-0 rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-zinc-600 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            Editar
          </button>
        ) : null}
      </div>
      <div className="mt-2 space-y-1">
        <p className="rounded-lg bg-zinc-50 px-2 py-1 font-medium text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          {m.home}
        </p>
        <p className="rounded-lg bg-zinc-50 px-2 py-1 font-medium text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          {m.away}
        </p>
      </div>
      <div className={`mt-2 space-y-0.5 ${compact ? "text-[10px]" : "text-xs"} text-zinc-500`}>
        <p>{formatScheduleDateTime(m.assignment.startsAt)}</p>
        <p>{m.assignment.courtLabel ?? "Cancha por definir"}</p>
      </div>
    </article>
  );
}

type Props = {
  schedule: CategoryScheduleMock | null | undefined;
  categoryLabel: string;
  /** Compact layout + scroll parent should set max-height. */
  compact?: boolean;
  onRequestEditMatch?: (matchId: string) => void;
};

export function ScheduleBracketView({
  schedule,
  categoryLabel,
  compact = false,
  onRequestEditMatch,
}: Props) {
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

  const phaseTitleClass = compact ? "text-xs" : "text-sm";
  const roundPill = compact ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1";
  const gap = compact ? "gap-3" : "gap-4";

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {phases.map((phase) => {
        const phaseRows = rows.filter((r) => r.phaseIdx === phase.idx);
        const rounds = [...new Set(phaseRows.map((r) => r.round))].sort(
          (a, b) => a - b,
        );

        return (
          <div key={phase.id}>
            <h5 className={`font-semibold text-zinc-900 dark:text-zinc-50 ${phaseTitleClass}`}>
              {phase.title}
            </h5>
            <div className="mt-2 overflow-x-auto pb-2">
              <div className={`flex min-w-max ${gap}`}>
                {rounds.map((round) => {
                  const matches = phaseRows.filter((r) => r.round === round);
                  const colW = compact ? "w-[13.5rem] shrink-0" : "w-64 shrink-0";
                  return (
                    <div key={`${phase.id}-${round}`} className={colW}>
                      <div
                        className={`mb-2 rounded-full bg-zinc-100 text-center font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 ${roundPill}`}
                      >
                        Ronda {round + 1}
                      </div>
                      <div className={compact ? "space-y-2" : "space-y-3"}>
                        {matches.map((m) => (
                          <BracketMatchCard
                            key={m.matchId}
                            m={m}
                            compact={compact}
                            onRequestEdit={onRequestEditMatch}
                          />
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
