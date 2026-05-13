"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readStoredTournaments,
  upsertStoredTournament,
  VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED,
} from "@/lib/local-tournaments";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import { tournaments as seedTournaments } from "@/lib/mock-data";
import type { TournamentMock } from "@/lib/mock-data";
import type { CategoryScheduleMock, ScheduleMatchMock } from "@/lib/schedule-types";
import {
  applyMatchResultToTournament,
  canRecordMatchResult,
  isBracketResultPhase,
  resolveSideToTeamLabel,
} from "@/lib/schedule-results";

function loadTournament(slug: string): TournamentMock | undefined {
  return mergeAdminTournaments(seedTournaments, readStoredTournaments()).find((t) => t.slug === slug);
}

function bracketMatchesForCategory(cs: CategoryScheduleMock) {
  const out: ScheduleMatchMock[] = [];
  for (const ph of cs.phases) {
    if (!isBracketResultPhase(ph)) continue;
    out.push(...ph.matches);
  }
  return out.sort((a, b) => a.round - b.round || a.orderInRound - b.orderInRound);
}

function MatchScoreEditor({
  match,
  categoryId,
  tournament,
  onSaved,
}: {
  match: ScheduleMatchMock;
  categoryId: string;
  tournament: TournamentMock;
  onSaved: (t: TournamentMock) => void;
}) {
  const sch = tournament.schedule!;
  const cs = sch.categorySchedules.find((c) => c.categoryId === categoryId)!;
  const homeLabel = resolveSideToTeamLabel(match.home, cs);
  const awayLabel = resolveSideToTeamLabel(match.away, cs);
  const can = canRecordMatchResult(cs, match.id);
  const [home, setHome] = useState(String(match.result?.home ?? ""));
  const [away, setAway] = useState(String(match.result?.away ?? ""));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHome(String(match.result?.home ?? ""));
    setAway(String(match.result?.away ?? ""));
  }, [match.id, match.result?.home, match.result?.away]);

  function save() {
    setMsg(null);
    const h = Number.parseInt(home, 10);
    const a = Number.parseInt(away, 10);
    setBusy(true);
    const res = applyMatchResultToTournament(tournament, categoryId, match.id, h, a);
    setBusy(false);
    if (!res.ok) {
      setMsg(res.message);
      return;
    }
    upsertStoredTournament(res.tournament);
    onSaved(res.tournament);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {homeLabel} <span className="text-zinc-400">vs</span> {awayLabel}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Ronda {match.round + 1} · orden {match.orderInRound + 1}
        {match.result ? (
          <span className="ml-2 text-emerald-700 dark:text-emerald-400">
            · Registrado {match.result.home}–{match.result.away}
          </span>
        ) : null}
      </p>
      {!can ? (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          Espera resultados de los partidos previos (o completa pools si aplica).
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-600">Local</label>
          <input
            type="number"
            min={0}
            className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            disabled={!can || busy}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600">Visitante</label>
          <input
            type="number"
            min={0}
            className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={away}
            onChange={(e) => setAway(e.target.value)}
            disabled={!can || busy}
          />
        </div>
        <button
          type="button"
          disabled={!can || busy}
          onClick={save}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-sky-600 dark:hover:bg-sky-700"
        >
          {busy ? "Guardando…" : "Guardar marcador"}
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs text-red-600">{msg}</p> : null}
    </div>
  );
}

export default function TorneoActivoDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0]! : "";
  const [tournament, setTournament] = useState<TournamentMock | undefined>(() =>
    slug ? loadTournament(slug) : undefined,
  );
  const [categoryId, setCategoryId] = useState("");

  const refresh = useCallback(() => {
    if (slug) setTournament(loadTournament(slug));
  }, [slug]);

  useEffect(() => {
    refresh();
    const fn = () => refresh();
    window.addEventListener(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED, fn);
    return () => window.removeEventListener(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED, fn);
  }, [refresh]);

  const sch = tournament?.schedule;

  useEffect(() => {
    if (!sch?.categorySchedules.length) return;
    setCategoryId((prev) => {
      if (prev && sch.categorySchedules.some((c) => c.categoryId === prev)) return prev;
      return sch.categorySchedules[0]!.categoryId;
    });
  }, [sch]);

  const categorySchedule = useMemo(
    () => sch?.categorySchedules.find((c) => c.categoryId === categoryId),
    [sch, categoryId],
  );

  const matches = useMemo(
    () => (categorySchedule ? bracketMatchesForCategory(categorySchedule) : []),
    [categorySchedule],
  );

  const catLabel = useMemo(() => {
    if (!tournament || !categorySchedule) return "";
    return tournament.categories.find((c) => c.id === categorySchedule.categoryId)?.label ?? categoryId;
  }, [tournament, categorySchedule, categoryId]);

  if (!slug) {
    return <p className="text-sm text-zinc-500">Slug inválido.</p>;
  }

  if (!tournament) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">No se encontró el torneo.</p>
        <Link href="/admin/torneos-activos" className="text-sm font-medium text-sky-600 hover:underline">
          ← Volver a Torneos activos
        </Link>
      </div>
    );
  }

  if (!sch?.published || !sch.categorySchedules.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-amber-800">
          Este torneo no tiene itinerario publicado. Publica el itinerario en Administración → Torneos → [torneo].
        </p>
        <Link href="/admin/torneos-activos" className="text-sm font-medium text-sky-600 hover:underline">
          ← Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/torneos-activos" className="text-sm font-medium text-sky-600 hover:underline">
            ← Torneos activos
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">{tournament.name}</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {tournament.tournamentStartsOn} — {tournament.tournamentEndsOn}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-600">Categoría</label>
        <select
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {sch.categorySchedules.map((c) => {
            const lab = tournament.categories.find((x) => x.id === c.categoryId)?.label ?? c.categoryId;
            return (
              <option key={c.categoryId} value={c.categoryId}>
                {lab}
              </option>
            );
          })}
        </select>
        <p className="mt-2 text-xs text-zinc-500">
          Solo se listan partidos de fase eliminatoria (bracket). Los pools round-robin no tienen marcador aquí en
          esta versión.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">{catLabel}</h2>
        {matches.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No hay partidos de bracket en esta categoría.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {matches.map((m) => (
              <MatchScoreEditor
                key={m.id}
                match={m}
                categoryId={categoryId}
                tournament={tournament}
                onSaved={setTournament}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
