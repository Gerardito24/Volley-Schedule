"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CategorySchedule,
  Match,
  MatchResult,
  MatchSide,
  ScheduleTeam,
  Tournament,
} from "@/lib/types";
import { categoryLabel, formatSetScores } from "@/lib/types";

interface Props {
  token: string;
  operatorName: string;
  tournament: Tournament;
}

// ---------------------------------------------------------------------------
// Helpers de resolución de equipo
// ---------------------------------------------------------------------------

function resolveLabel(side: MatchSide, teams: ScheduleTeam[], allMatches: Match[]): string {
  if (side.type === "seed") return teams[side.seed]?.label ?? `Semilla ${side.seed + 1}`;
  if (side.type === "bye") return "Bye";
  if (side.type === "winner") {
    const m = allMatches.find((x) => x.id === side.matchId);
    return m ? `Ganador J${m.order}` : "TBD";
  }
  if (side.type === "loser") {
    const m = allMatches.find((x) => x.id === side.matchId);
    return m ? `Perdedor J${m.order}` : "TBD";
  }
  if (side.type === "pool") return `${side.rank}° Pool`;
  return "TBD";
}

// ---------------------------------------------------------------------------
// Componente de entrada de sets
// ---------------------------------------------------------------------------

interface SetEntryProps {
  token: string;
  matchId: string;
  initialResult: MatchResult | null | undefined;
  homeLabel: string;
  awayLabel: string;
  onSaved: () => void;
  onCancel: () => void;
}

function SetEntry({
  token,
  matchId,
  initialResult,
  homeLabel,
  awayLabel,
  onSaved,
  onCancel,
}: SetEntryProps) {
  const [sets, setSets] = useState<Array<{ home: string; away: string }>>(
    initialResult?.sets?.map((s) => ({
      home: String(s.home),
      away: String(s.away),
    })) ?? [{ home: "", away: "" }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSet(i: number, side: "home" | "away", val: string) {
    const next = [...sets];
    next[i] = { ...next[i], [side]: val.replace(/\D/g, "").slice(0, 3) };
    setSets(next);
  }

  function addSet() {
    setSets((s) => [...s, { home: "", away: "" }]);
  }

  function removeSet(i: number) {
    setSets((s) => s.filter((_, idx) => idx !== i));
  }

  async function save() {
    const parsed = sets.map((s) => ({
      home: parseInt(s.home, 10),
      away: parseInt(s.away, 10),
    }));

    for (const s of parsed) {
      if (isNaN(s.home) || isNaN(s.away)) {
        setError("Completa todos los marcadores antes de guardar.");
        return;
      }
      if (s.home === s.away) {
        setError("Un set no puede terminar en empate.");
        return;
      }
    }
    if (parsed.length === 0) {
      setError("Agrega al menos un set.");
      return;
    }

    const homeWins = parsed.filter((s) => s.home > s.away).length;
    const awayWins = parsed.length - homeWins;
    const result: MatchResult = {
      home: homeWins,
      away: awayWins,
      sets: parsed,
      recordedAt: new Date().toISOString(),
    };

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scorer/${token}/match/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(d?.error ?? "No se pudo guardar.");
        return;
      }
      onSaved();
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="mb-3 flex justify-between text-xs font-semibold text-indigo-700">
        <span className="truncate max-w-[40%]">{homeLabel}</span>
        <span className="text-zinc-400">vs</span>
        <span className="truncate max-w-[40%] text-right">{awayLabel}</span>
      </div>

      <div className="space-y-2">
        {sets.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-center text-xs font-medium text-zinc-500">
              Set {i + 1}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={s.home}
              onChange={(e) => updateSet(i, "home", e.target.value)}
              placeholder="0"
              className="h-10 w-16 rounded-lg border border-zinc-300 bg-white text-center text-lg font-bold text-zinc-900 outline-none focus:border-indigo-500"
            />
            <span className="text-zinc-400">–</span>
            <input
              type="text"
              inputMode="numeric"
              value={s.away}
              onChange={(e) => updateSet(i, "away", e.target.value)}
              placeholder="0"
              className="h-10 w-16 rounded-lg border border-zinc-300 bg-white text-center text-lg font-bold text-zinc-900 outline-none focus:border-indigo-500"
            />
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(i)}
                className="ml-auto text-zinc-400 hover:text-red-500"
                aria-label="Eliminar set"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-500"
      >
        + Agregar set
      </button>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fila de partido
// ---------------------------------------------------------------------------

interface MatchRowProps {
  match: Match;
  catSchedule: CategorySchedule;
  token: string;
  onSaved: () => void;
}

function MatchRow({ match, catSchedule, token, onSaved }: MatchRowProps) {
  const [open, setOpen] = useState(false);
  const { teams, matches } = catSchedule;

  const homeLabel = resolveLabel(match.home, teams, matches);
  const awayLabel = resolveLabel(match.away, teams, matches);
  const hasBye = match.home.type === "bye" || match.away.type === "bye";
  const hasResult = !!match.result;
  const setDetail = formatSetScores(match.result);

  return (
    <div className="border-b border-zinc-100 last:border-0">
      <button
        type="button"
        onClick={() => !hasBye && setOpen((o) => !o)}
        disabled={hasBye}
        className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span className="w-6 shrink-0 text-center text-xs font-medium text-zinc-400">
          J{match.order}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">
            {homeLabel}
            <span className="mx-1.5 text-zinc-400">vs</span>
            {awayLabel}
          </p>
          {match.startsAt && (
            <p className="text-xs text-zinc-400">
              {new Date(match.startsAt).toLocaleTimeString("es-PR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {match.court ? ` · ${match.court}` : ""}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {hasBye ? (
            <span className="text-xs text-zinc-400">Bye</span>
          ) : hasResult ? (
            <div>
              <span className="text-sm font-bold text-zinc-900">
                {match.result!.home}–{match.result!.away}
              </span>
              {setDetail && (
                <p className="text-xs text-zinc-500">{setDetail}</p>
              )}
            </div>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Anotar
            </span>
          )}
        </div>
        {!hasBye && (
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 shrink-0 fill-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <SetEntry
            token={token}
            matchId={match.id}
            initialResult={match.result}
            homeLabel={homeLabel}
            awayLabel={awayLabel}
            onSaved={() => {
              setOpen(false);
              onSaved();
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScorerApp principal
// ---------------------------------------------------------------------------

export default function ScorerApp({ token, operatorName, tournament }: Props) {
  const router = useRouter();
  const schedule = tournament.schedule;

  const [activeCatIdx, setActiveCatIdx] = useState(0);

  if (!schedule || !schedule.published) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
          <p className="text-lg font-semibold text-zinc-900">Itinerario no publicado</p>
          <p className="mt-2 text-sm text-zinc-500">
            El itinerario de este torneo aún no está disponible.
          </p>
        </div>
      </div>
    );
  }

  const categories = schedule.categories;
  const activeCat = categories[activeCatIdx];

  // Agrupar partidos por fase
  const phases = activeCat
    ? [...new Map(activeCat.matches.map((m) => [m.phaseLabel, m.phaseLabel])).keys()]
    : [];

  function getCatLabel(idx: number): string {
    const cat = categories[idx];
    const category = tournament.categories.find((c) => c.id === cat.categoryId);
    return category ? categoryLabel(tournament, category) : cat.categoryId;
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">{tournament.name}</p>
            <p className="text-sm font-semibold text-zinc-900">{operatorName}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            En línea
          </span>
        </div>

        {/* Tabs de categoría */}
        {categories.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveCatIdx(idx)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeCatIdx === idx
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {getCatLabel(idx)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de partidos */}
      <div className="p-4 space-y-4">
        {activeCat && phases.length > 0 ? (
          phases.map((phase) => {
            const phaseMatches = activeCat.matches
              .filter((m) => m.phaseLabel === phase)
              .sort((a, b) => a.order - b.order);
            return (
              <div key={phase} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {phase}
                  </h2>
                </div>
                {phaseMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    catSchedule={activeCat}
                    token={token}
                    onSaved={() => router.refresh()}
                  />
                ))}
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-zinc-500">No hay partidos en esta categoría.</p>
          </div>
        )}
      </div>

      <p className="pb-8 text-center text-xs text-zinc-400">
        VolleyHub PR · Mesa de anotación
      </p>
    </div>
  );
}
