"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ACTIVE_TOURNAMENTS_DONE_EVENT,
  isActiveTournamentMarkedDone,
  markActiveTournamentDone,
} from "@/lib/active-tournaments-done";
import { isInActiveTournamentWindow } from "@/lib/active-tournaments-window";
import { computeMergedTournaments } from "@/hooks/use-merged-tournaments";
import { VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED } from "@/lib/local-tournaments";
import { formatTournamentLocationsLine, CLUB_REGISTRY_SLUG } from "@/lib/mock-data";
import type { TournamentMock } from "@/lib/mock-data";

function reloadMergedAsync(): Promise<TournamentMock[]> {
  return computeMergedTournaments();
}

function isEligibleActiveTournament(t: TournamentMock): boolean {
  if (t.slug === CLUB_REGISTRY_SLUG) return false;
  const s = t.schedule;
  if (!s?.published) return false;
  if (!s.categorySchedules.some((cs) => cs.phases.some((p) => p.matches.length > 0))) return false;
  if (!isInActiveTournamentWindow(t.tournamentStartsOn)) return false;
  if (isActiveTournamentMarkedDone(t.slug)) return false;
  return true;
}

export default function TorneosActivosPage() {
  const [list, setList] = useState<TournamentMock[]>([]);

  const refresh = useCallback(() => {
    void reloadMergedAsync().then((merged) =>
      setList(merged.filter(isEligibleActiveTournament)),
    );
  }, []);

  useEffect(() => {
    refresh();
    const onDone = () => refresh();
    const onStored = () => refresh();
    window.addEventListener(ACTIVE_TOURNAMENTS_DONE_EVENT, onDone);
    window.addEventListener(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED, onStored);
    return () => {
      window.removeEventListener(ACTIVE_TOURNAMENTS_DONE_EVENT, onDone);
      window.removeEventListener(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED, onStored);
    };
  }, [refresh]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Torneos activos</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Torneos con itinerario publicado, desde el día anterior a la fecha de inicio. Marca &quot;Hecho&quot; cuando
          termine el evento para ocultarlo de esta lista. Los marcadores que guardes aquí son los mismos que ve el
          público en itinerarios.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-sm">
          No hay torneos activos en este momento (o todos están marcados como hecho).
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((t) => (
            <li
              key={t.slug}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-zinc-900">{t.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {t.tournamentStartsOn} — {t.tournamentEndsOn} · {formatTournamentLocationsLine(t)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/torneos-activos/${t.slug}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Gestionar marcadores
                </Link>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `¿Marcar "${t.name}" como hecho? Dejará de aparecer en Torneos activos (el itinerario público no se borra).`,
                      )
                    ) {
                      return;
                    }
                    markActiveTournamentDone(t.slug);
                  }}
                >
                  Marcar como hecho
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
