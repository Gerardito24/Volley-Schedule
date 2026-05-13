"use client";

import { useEffect, useState } from "react";
import type { ScheduleAssignmentMock } from "@/lib/schedule-types";
import { resolveCourtIdFromAssignment } from "@/lib/tournament-courts";
import type { CourtRef } from "@/lib/tournament-courts";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  assignment: ScheduleAssignmentMock;
  scheduleDatetimeMin: string;
  scheduleDatetimeMax: string;
  tourCourts: CourtRef[];
  courtIdsForScheduleEdit: string[];
  onClose: () => void;
  onSave: (patch: Partial<ScheduleAssignmentMock>) => void;
};

export function MatchScheduleEditDialog({
  open,
  title,
  subtitle,
  assignment,
  scheduleDatetimeMin,
  scheduleDatetimeMax,
  tourCourts,
  courtIdsForScheduleEdit,
  onClose,
  onSave,
}: Props) {
  const as = assignment;
  const startsLocal =
    as.startsAt && as.startsAt.includes("T")
      ? as.startsAt.slice(0, 16)
      : as.startsAt ?? "";

  const [starts, setStarts] = useState(startsLocal);
  const [courtId, setCourtId] = useState(
    () => resolveCourtIdFromAssignment(as, tourCourts) ?? "",
  );
  const [courtLabelFree, setCourtLabelFree] = useState(as.courtLabel ?? "");

  useEffect(() => {
    if (!open) return;
    const s =
      as.startsAt && as.startsAt.includes("T")
        ? as.startsAt.slice(0, 16)
        : as.startsAt ?? "";
    setStarts(s);
    setCourtId(resolveCourtIdFromAssignment(as, tourCourts) ?? "");
    setCourtLabelFree(as.courtLabel ?? "");
  }, [open, as]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tourCourts.length > 0) {
      const ref = tourCourts.find((c) => c.id === courtId);
      onSave({
        startsAt: starts ? `${starts}:00` : undefined,
        courtId: courtId || undefined,
        courtLabel: ref?.label,
      });
    } else {
      onSave({
        startsAt: starts ? `${starts}:00` : undefined,
        courtLabel: courtLabelFree || undefined,
      });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-edit-title"
      >
        <h2 id="match-edit-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Editar partido
        </h2>
        <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Hora de juego
            </label>
            <input
              type="datetime-local"
              min={scheduleDatetimeMin}
              max={scheduleDatetimeMax}
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Cancha
            </label>
            {tourCourts.length > 0 ? (
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              >
                <option value="">—</option>
                {courtIdsForScheduleEdit.map((cid) => {
                  const ref = tourCourts.find((c) => c.id === cid);
                  return (
                    <option key={cid} value={cid}>
                      {ref?.label ?? cid}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Cancha 1"
                value={courtLabelFree}
                onChange={(e) => setCourtLabelFree(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Guardar
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
