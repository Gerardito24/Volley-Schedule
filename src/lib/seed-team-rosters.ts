import { registrationRows } from "@/lib/mock-data";
import type { RegistrationRowMock } from "@/lib/mock-data";
import type { RosterPlayer, TeamRoster } from "@/lib/team-roster-types";

/** 10 posiciones típicas (voleibol) para filas seed. */
const SEED_POSITIONS = [
  "Colocador",
  "Opuesto",
  "Central",
  "Receptor",
  "Líbero",
  "Central",
  "Receptor",
  "Opuesto",
  "Receptor",
  "Central",
] as const;

function rosterTimestamp(reg: RegistrationRowMock): string {
  const u = reg.updatedAt.trim();
  if (u.includes("T")) return u;
  return `${u}T12:00:00.000Z`;
}

function buildPlayers(reg: RegistrationRowMock): RosterPlayer[] {
  const shortClub = (reg.clubName || reg.teamName || "Equipo").slice(0, 18).trim();
  return Array.from({ length: 10 }, (_, i) => ({
    id: `seed-pl-${reg.id}-${i + 1}`,
    fullName: `Jugador ${String(i + 1).padStart(2, "0")} · ${shortClub}`,
    jerseyNumber: String(i + 1),
    position: SEED_POSITIONS[i] ?? "Receptor",
  }));
}

function rosterFromRegistration(reg: RegistrationRowMock): TeamRoster {
  const coachName = reg.coach?.name ?? "";
  const coachPhone = reg.coach?.phone ?? "";
  return {
    id: `seed-roster-${reg.id}`,
    registrationId: reg.id,
    clubName: reg.clubName || reg.teamName,
    teamName: reg.teamName,
    tournamentSlug: reg.tournamentSlug,
    tournamentName: reg.tournamentName,
    categoryId: reg.categoryId,
    divisionLabel: reg.divisionLabel,
    coachName,
    coachPhone,
    players: buildPlayers(reg),
    createdAt: reg.registeredAt,
    updatedAt: rosterTimestamp(reg),
  };
}

/** Un roster con 10 jugadores por cada fila de `registrationRows` (mock + demos). */
export const seedTeamRosters: TeamRoster[] = registrationRows.map(rosterFromRegistration);
