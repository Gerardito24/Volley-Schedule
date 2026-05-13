import { buildMatchOrderIndex, formatMatchSide } from "@/lib/schedule-display";
import type {
  CategoryScheduleMock,
  MatchSideRef,
  ScheduleMatchMock,
  SchedulePhaseMock,
} from "@/lib/schedule-types";
import type { TournamentMock } from "@/lib/mock-data";

export function allCategoryMatches(cs: CategoryScheduleMock): ScheduleMatchMock[] {
  return cs.phases.flatMap((p) => p.matches);
}

export function matchById(
  cs: CategoryScheduleMock,
  matchId: string,
): ScheduleMatchMock | undefined {
  return allCategoryMatches(cs).find((m) => m.id === matchId);
}

export function phaseForMatch(
  cs: CategoryScheduleMock,
  match: ScheduleMatchMock,
): SchedulePhaseMock | undefined {
  return cs.phases.find((p) => p.id === match.phaseId);
}

/** MVP: registrar resultados solo en fases eliminatorias (incluye bracket tras pools). */
export function isBracketResultPhase(phase: SchedulePhaseMock): boolean {
  return phase.kind === "single_elim";
}

export function winnerSideOfMatch(m: ScheduleMatchMock): "home" | "away" | null {
  const r = m.result;
  if (!r) return null;
  if (r.home > r.away) return "home";
  if (r.away > r.home) return "away";
  return null;
}

function dependenciesSatisfiedForSide(side: MatchSideRef, cs: CategoryScheduleMock): boolean {
  switch (side.type) {
    case "seed":
    case "bye":
      return true;
    case "poolStanding":
      return false;
    case "winner":
    case "loser": {
      const m = matchById(cs, side.matchId);
      return !!m?.result && winnerSideOfMatch(m) !== null;
    }
    default:
      return false;
  }
}

export function canRecordMatchResult(cs: CategoryScheduleMock, matchId: string): boolean {
  const m = matchById(cs, matchId);
  if (!m) return false;
  const ph = phaseForMatch(cs, m);
  if (!ph || !isBracketResultPhase(ph)) return false;
  if (m.result) return true;
  return dependenciesSatisfiedForSide(m.home, cs) && dependenciesSatisfiedForSide(m.away, cs);
}

/**
 * Resuelve un lado del partido al nombre del equipo (o BYE / texto de pool) según resultados ya guardados.
 * Si falta un resultado previo, cae en la etiqueta genérica de `formatMatchSide`.
 */
export function resolveSideToTeamLabel(
  side: MatchSideRef,
  cs: CategoryScheduleMock,
  depth = 0,
): string {
  if (depth > 48) return "—";
  const indexById = buildMatchOrderIndex(allCategoryMatches(cs));
  switch (side.type) {
    case "bye":
      return "BYE";
    case "seed": {
      const name = cs.teamLabels[side.seedIndex - 1]?.trim();
      return name || `Seed ${side.seedIndex}`;
    }
    case "poolStanding":
      return `${side.poolId} · ${side.place}º`;
    case "winner":
    case "loser": {
      const ref = matchById(cs, side.matchId);
      if (!ref) return formatMatchSide(side, cs.teamLabels, indexById);
      const win = winnerSideOfMatch(ref);
      if (!win) return formatMatchSide(side, cs.teamLabels, indexById);
      const targetSide =
        side.type === "winner"
          ? win === "home"
            ? ref.home
            : ref.away
          : win === "home"
            ? ref.away
            : ref.home;
      return resolveSideToTeamLabel(targetSide, cs, depth + 1);
    }
    default:
      return "—";
  }
}

export function applyMatchResult(
  cs: CategoryScheduleMock,
  matchId: string,
  home: number,
  away: number,
):
  | { ok: true; next: CategoryScheduleMock }
  | { ok: false; message: string } {
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return { ok: false, message: "Marcador inválido." };
  }
  if (home === away) {
    return { ok: false, message: "Debe haber un ganador (marcadores distintos)." };
  }
  if (!canRecordMatchResult(cs, matchId)) {
    return { ok: false, message: "Aún no se pueden registrar resultados de este partido." };
  }
  const next: CategoryScheduleMock = JSON.parse(JSON.stringify(cs)) as CategoryScheduleMock;
  const m = matchById(next, matchId);
  if (!m) return { ok: false, message: "Partido no encontrado." };
  m.result = { home, away, recordedAt: new Date().toISOString() };
  return { ok: true, next };
}

export function applyMatchResultToTournament(
  tournament: TournamentMock,
  categoryId: string,
  matchId: string,
  home: number,
  away: number,
):
  | { ok: true; tournament: TournamentMock }
  | { ok: false; message: string } {
  const sch = tournament.schedule;
  if (!sch?.published) {
    return { ok: false, message: "El itinerario no está publicado." };
  }
  const idx = sch.categorySchedules.findIndex((c) => c.categoryId === categoryId);
  if (idx < 0) return { ok: false, message: "Categoría no encontrada." };
  const cs = sch.categorySchedules[idx]!;
  const res = applyMatchResult(cs, matchId, home, away);
  if (!res.ok) return res;
  const nextSchedules = sch.categorySchedules.map((c, i) => (i === idx ? res.next : c));
  return {
    ok: true,
    tournament: {
      ...tournament,
      schedule: { ...sch, categorySchedules: nextSchedules },
    },
  };
}
