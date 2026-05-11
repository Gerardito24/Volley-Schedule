import type {
  CategoryMock,
  SubdivisionMock,
  TournamentMock,
} from "@/lib/mock-data";

export const LOCAL_TOURNAMENTS_KEY = "volleyschedule-admin-tournaments-v2";

export function readStoredTournaments(): TournamentMock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_TOURNAMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTournamentMock);
  } catch {
    return [];
  }
}

export function writeStoredTournaments(tournaments: TournamentMock[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_TOURNAMENTS_KEY, JSON.stringify(tournaments));
}

export function appendStoredTournament(tournament: TournamentMock): void {
  const existing = readStoredTournaments();
  writeStoredTournaments([...existing, tournament]);
}

function isSubdivisionMock(value: unknown): value is SubdivisionMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.label === "string";
}

function isCategoryMock(value: unknown): value is CategoryMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.label !== "string" ||
    !(o.feeCents === null || typeof o.feeCents === "number") ||
    !(o.maxTeams === null || typeof o.maxTeams === "number") ||
    !Array.isArray(o.subdivisions)
  ) {
    return false;
  }
  return o.subdivisions.every(isSubdivisionMock);
}

function isTournamentMock(value: unknown): value is TournamentMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
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
    o.categories.every(isCategoryMock)
  );
}
