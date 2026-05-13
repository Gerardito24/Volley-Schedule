import type {
  CategoryMock,
  SubdivisionMock,
  TournamentDivisionMock,
  TournamentMock,
} from "@/lib/mock-data";
import { normalizeTournament } from "@/lib/mock-data";
import type {
  CategoryScheduleMock,
  MatchSideRef,
  ScheduleAssignmentMock,
  ScheduleMatchMock,
  SchedulePhaseMock,
  SchedulePoolMock,
  TournamentScheduleMock,
} from "@/lib/schedule-types";
import { upsertRemoteTournament } from "@/lib/remote-tournaments";

export const LOCAL_TOURNAMENTS_KEY = "volleyschedule-admin-tournaments-v2";

export const VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED = "volleyschedule-tournaments-stored-changed";

export function readStoredTournaments(): TournamentMock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_TOURNAMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTournamentMock).map(normalizeTournament);
  } catch {
    return [];
  }
}

export function writeStoredTournaments(tournaments: TournamentMock[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_TOURNAMENTS_KEY, JSON.stringify(tournaments));
  window.dispatchEvent(new CustomEvent(VOLLEYSCHEDULE_TOURNAMENTS_STORED_CHANGED));
}

export function appendStoredTournament(tournament: TournamentMock): void {
  const existing = readStoredTournaments();
  writeStoredTournaments([...existing, tournament]);
}

/** Reemplaza o agrega un torneo por slug (p. ej. guardar itinerario sobre un torneo seed). */
export function upsertStoredTournament(tournament: TournamentMock): void {
  const existing = readStoredTournaments();
  const idx = existing.findIndex((t) => t.slug === tournament.slug);
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = tournament;
    writeStoredTournaments(next);
  } else {
    writeStoredTournaments([...existing, tournament]);
  }
  void upsertRemoteTournament(tournament).catch(() => {
    // Railway/Postgres is optional during migration; localStorage remains fallback.
  });
}

function isMatchSideRef(value: unknown): value is MatchSideRef {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (o.type === "bye") return true;
  if (o.type === "seed")
    return typeof o.seedIndex === "number" && o.seedIndex >= 1 && Number.isInteger(o.seedIndex);
  if (o.type === "winner" || o.type === "loser")
    return typeof o.matchId === "string" && o.matchId.length > 0;
  if (o.type === "poolStanding")
    return (
      typeof o.poolId === "string" &&
      o.poolId.length > 0 &&
      typeof o.place === "number" &&
      o.place >= 1 &&
      Number.isInteger(o.place)
    );
  return false;
}

function isScheduleMatchResultMock(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.home === "number" &&
    Number.isInteger(o.home) &&
    o.home >= 0 &&
    typeof o.away === "number" &&
    Number.isInteger(o.away) &&
    o.away >= 0 &&
    typeof o.recordedAt === "string" &&
    o.recordedAt.length > 0
  );
}

function isScheduleMatchMock(value: unknown): value is ScheduleMatchMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if ("result" in o && !isScheduleMatchResultMock(o.result)) return false;
  return (
    typeof o.id === "string" &&
    typeof o.phaseId === "string" &&
    typeof o.round === "number" &&
    Number.isInteger(o.round) &&
    o.round >= 0 &&
    typeof o.orderInRound === "number" &&
    Number.isInteger(o.orderInRound) &&
    o.orderInRound >= 0 &&
    isMatchSideRef(o.home) &&
    isMatchSideRef(o.away)
  );
}

function isSchedulePoolMock(value: unknown): value is SchedulePoolMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.label !== "string" ||
    !Array.isArray(o.seedIndices)
  ) {
    return false;
  }
  return o.seedIndices.every(
    (x: unknown) => typeof x === "number" && Number.isInteger(x) && x >= 1,
  );
}

function isSchedulePhaseMock(value: unknown): value is SchedulePhaseMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const kindOk =
    o.kind === "pool_play" ||
    o.kind === "single_elim" ||
    o.kind === "round_robin";
  if (
    !kindOk ||
    typeof o.id !== "string" ||
    typeof o.templateId !== "string" ||
    !o.config ||
    typeof o.config !== "object" ||
    !Array.isArray(o.pools) ||
    !Array.isArray(o.matches)
  ) {
    return false;
  }
  return (
    o.pools.every(isSchedulePoolMock) && o.matches.every(isScheduleMatchMock)
  );
}

function isScheduleAssignmentMock(value: unknown): value is ScheduleAssignmentMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const startsOk =
    o.startsAt === undefined ||
    o.startsAt === null ||
    typeof o.startsAt === "string";
  const courtOk =
    o.courtLabel === undefined ||
    o.courtLabel === null ||
    typeof o.courtLabel === "string";
  const courtIdOk =
    o.courtId === undefined || o.courtId === null || typeof o.courtId === "string";
  return startsOk && courtOk && courtIdOk;
}

function isCategorySchedulingMetaMock(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const base =
    typeof o.durationMinutes === "number" &&
    Number.isInteger(o.durationMinutes) &&
    o.durationMinutes > 0 &&
    typeof o.courtCount === "number" &&
    Number.isInteger(o.courtCount) &&
    o.courtCount >= 1;
  if (!base) return false;
  if (o.allowedCourtIds === undefined || o.allowedCourtIds === null) return true;
  if (!Array.isArray(o.allowedCourtIds)) return false;
  if (o.allowedCourtIds.length === 0) return false;
  if (!o.allowedCourtIds.every((x: unknown) => typeof x === "string" && x.length > 0)) {
    return false;
  }
  if (o.allowedCourtIds.length !== o.courtCount) return false;
  return true;
}

function isCategoryScheduleMock(value: unknown): value is CategoryScheduleMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (
    typeof o.categoryId !== "string" ||
    !Array.isArray(o.teamLabels) ||
    !Array.isArray(o.phases) ||
    !o.assignments ||
    typeof o.assignments !== "object"
  ) {
    return false;
  }
  if (!isCategorySchedulingMetaMock(o.schedulingMeta)) return false;
  const labelsOk = o.teamLabels.every((x: unknown) => typeof x === "string");
  const phasesOk = o.phases.every(isSchedulePhaseMock);
  const assignOk = Object.values(o.assignments as Record<string, unknown>).every(
    isScheduleAssignmentMock,
  );
  return labelsOk && phasesOk && assignOk;
}

function isTournamentScheduleMock(value: unknown): value is TournamentScheduleMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.published === "boolean" &&
    Array.isArray(o.categorySchedules) &&
    o.categorySchedules.every(isCategoryScheduleMock)
  );
}

function isSubdivisionMock(value: unknown): value is SubdivisionMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const maxOk =
    o.maxTeams === undefined ||
    o.maxTeams === null ||
    typeof o.maxTeams === "number";
  return typeof o.id === "string" && typeof o.label === "string" && maxOk;
}

function isTournamentDivisionMock(value: unknown): value is TournamentDivisionMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.label === "string";
}

function isCategoryMock(value: unknown): value is CategoryMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const ageOk = o.ageLabel === undefined || typeof o.ageLabel === "string";
  const divIdOk = o.divisionId === undefined || typeof o.divisionId === "string";
  const titleManualOk =
    o.categoryTitleManual === undefined || typeof o.categoryTitleManual === "boolean";
  const genderOk =
    o.gender === undefined ||
    o.gender === "masculino" ||
    o.gender === "femenino" ||
    o.gender === "mixto";
  if (
    typeof o.id !== "string" ||
    typeof o.label !== "string" ||
    !ageOk ||
    !divIdOk ||
    !titleManualOk ||
    !genderOk ||
    !(o.feeCents === null || typeof o.feeCents === "number") ||
    !(o.maxTeams === null || typeof o.maxTeams === "number") ||
    !Array.isArray(o.subdivisions)
  ) {
    return false;
  }
  return o.subdivisions.every(isSubdivisionMock);
}

function isTournamentVenueEntry(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const ccOk =
    o.courtCount === undefined ||
    o.courtCount === null ||
    (typeof o.courtCount === "number" &&
      Number.isInteger(o.courtCount) &&
      o.courtCount >= 0);
  return typeof o.label === "string" && ccOk;
}

function isTournamentMock(value: unknown): value is TournamentMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const scheduleOk =
    o.schedule === undefined ||
    o.schedule === null ||
    isTournamentScheduleMock(o.schedule);
  const locsOk =
    o.locations === undefined ||
    (Array.isArray(o.locations) && o.locations.every((x: unknown) => typeof x === "string"));
  const courtOk =
    o.courtCount === undefined || o.courtCount === null || typeof o.courtCount === "number";
  const venuesOk =
    o.venues === undefined ||
    (Array.isArray(o.venues) && o.venues.every(isTournamentVenueEntry));
  const divisionsOk =
    o.divisions === undefined ||
    (Array.isArray(o.divisions) && o.divisions.every(isTournamentDivisionMock));
  return (
    typeof o.slug === "string" &&
    typeof o.name === "string" &&
    typeof o.description === "string" &&
    typeof o.locationLabel === "string" &&
    typeof o.registrationDeadlineOn === "string" &&
    typeof o.tournamentStartsOn === "string" &&
    typeof o.tournamentEndsOn === "string" &&
    (o.registrationFeeCents === null || typeof o.registrationFeeCents === "number") &&
    (o.publicEntryFeeCents === null || typeof o.publicEntryFeeCents === "number") &&
    (o.promoImageDataUrl === null || typeof o.promoImageDataUrl === "string") &&
    (o.status === "open" || o.status === "closed" || o.status === "draft") &&
    Array.isArray(o.categories) &&
    o.categories.every(isCategoryMock) &&
    scheduleOk &&
    locsOk &&
    courtOk &&
    venuesOk &&
    divisionsOk
  );
}
