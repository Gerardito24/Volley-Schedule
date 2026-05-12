import type { TeamRoster } from "@/lib/team-roster-types";

export const LOCAL_ROSTERS_KEY = "volleyschedule-team-rosters-v1";

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("volleyschedule-rosters-changed"));
}

export function readStoredRosters(): TeamRoster[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ROSTERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed.filter(isTeamRoster) as TeamRoster[]).map(normalizeTeamRoster);
  } catch {
    return [];
  }
}

export function writeStoredRosters(rosters: TeamRoster[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_ROSTERS_KEY, JSON.stringify(rosters));
}

export function upsertStoredRoster(roster: TeamRoster): void {
  const existing = readStoredRosters();
  const idx = existing.findIndex((r) => r.id === roster.id);
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = roster;
    writeStoredRosters(next);
  } else {
    writeStoredRosters([...existing, roster]);
  }
  notify();
}

/**
 * Create a stub roster (empty players list) from a registration.
 * Safe to call multiple times — will not duplicate if same registrationId exists.
 */
export function createStubRosterFromRegistration(reg: {
  id: string;
  clubName: string;
  teamName: string;
  tournamentSlug: string;
  tournamentName: string;
  categoryId: string;
  divisionLabel: string;
}): TeamRoster {
  const existing = readStoredRosters();
  const found = existing.find((r) => r.registrationId === reg.id);
  if (found) return found;

  const now = new Date().toISOString();
  const stub: TeamRoster = {
    id: `roster-${crypto.randomUUID()}`,
    registrationId: reg.id,
    clubName: reg.clubName,
    teamName: reg.teamName,
    tournamentSlug: reg.tournamentSlug,
    tournamentName: reg.tournamentName,
    categoryId: reg.categoryId,
    divisionLabel: reg.divisionLabel,
    coachName: "",
    coachPhone: "",
    players: [],
    createdAt: now,
    updatedAt: now,
  };
  writeStoredRosters([...existing, stub]);
  notify();
  return stub;
}

function isRosterPlayer(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.fullName === "string";
}

function isTeamRoster(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const coachOk =
    (o.coachName === undefined || typeof o.coachName === "string") &&
    (o.coachPhone === undefined || typeof o.coachPhone === "string");
  return (
    typeof o.id === "string" &&
    typeof o.registrationId === "string" &&
    typeof o.clubName === "string" &&
    typeof o.teamName === "string" &&
    typeof o.tournamentSlug === "string" &&
    typeof o.tournamentName === "string" &&
    typeof o.categoryId === "string" &&
    typeof o.divisionLabel === "string" &&
    coachOk &&
    Array.isArray(o.players) &&
    (o.players as unknown[]).every(isRosterPlayer)
  );
}

export function normalizeTeamRoster(r: TeamRoster): TeamRoster {
  return {
    ...r,
    coachName: r.coachName ?? "",
    coachPhone: r.coachPhone ?? "",
  };
}
