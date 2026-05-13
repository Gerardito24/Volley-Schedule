import type { TeamRoster } from "@/lib/team-roster-types";

/**
 * Roster seed sustituido por la copia en localStorage si comparten `registrationId`;
 * después se añaden rosters solo locales (inscripción que no está en seed).
 */
export function mergeTeamRosters(seed: TeamRoster[], stored: TeamRoster[]): TeamRoster[] {
  const storedByReg = new Map(stored.map((r) => [r.registrationId, r]));
  const seedRegIds = new Set(seed.map((r) => r.registrationId));
  const out: TeamRoster[] = [];
  for (const row of seed) {
    out.push(storedByReg.get(row.registrationId) ?? row);
  }
  for (const row of stored) {
    if (!seedRegIds.has(row.registrationId)) out.push(row);
  }
  return out;
}
