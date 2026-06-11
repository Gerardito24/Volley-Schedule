import { promises as fs } from "fs";
import path from "path";
import type {
  AdminUser,
  ClubProfile,
  Registration,
  TeamRoster,
  Tournament,
} from "./types";
import { buildSeedData } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");

type CollectionName =
  | "tournaments"
  | "registrations"
  | "clubs"
  | "rosters"
  | "admins";

interface CollectionTypes {
  tournaments: Tournament;
  registrations: Registration;
  clubs: ClubProfile;
  rosters: TeamRoster;
  admins: AdminUser;
}

let seeded = false;

async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const marker = path.join(DATA_DIR, "tournaments.json");
  try {
    await fs.access(marker);
  } catch {
    const seed = buildSeedData();
    await Promise.all([
      writeFileRaw("tournaments", seed.tournaments),
      writeFileRaw("registrations", seed.registrations),
      writeFileRaw("clubs", seed.clubs),
      writeFileRaw("rosters", seed.rosters),
      writeFileRaw("admins", seed.admins),
    ]);
  }
  seeded = true;
}

function fileFor(name: CollectionName): string {
  return path.join(DATA_DIR, `${name}.json`);
}

async function writeFileRaw(name: CollectionName, value: unknown): Promise<void> {
  const tmp = `${fileFor(name)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, fileFor(name));
}

export async function readCollection<N extends CollectionName>(
  name: N,
): Promise<CollectionTypes[N][]> {
  await ensureSeeded();
  try {
    const raw = await fs.readFile(fileFor(name), "utf8");
    return JSON.parse(raw) as CollectionTypes[N][];
  } catch {
    return [];
  }
}

export async function writeCollection<N extends CollectionName>(
  name: N,
  items: CollectionTypes[N][],
): Promise<void> {
  await ensureSeeded();
  await writeFileRaw(name, items);
}

// ---------------------------------------------------------------------------
// Helpers de dominio
// ---------------------------------------------------------------------------

export async function getTournaments(): Promise<Tournament[]> {
  const items = await readCollection("tournaments");
  return items.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

export async function getTournament(slug: string): Promise<Tournament | null> {
  const items = await readCollection("tournaments");
  return items.find((t) => t.slug === slug) ?? null;
}

export async function saveTournament(tournament: Tournament): Promise<void> {
  const items = await readCollection("tournaments");
  const idx = items.findIndex((t) => t.slug === tournament.slug);
  const next = { ...tournament, updatedAt: new Date().toISOString() };
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  await writeCollection("tournaments", items);
}

export async function deleteTournament(slug: string): Promise<void> {
  const items = await readCollection("tournaments");
  await writeCollection(
    "tournaments",
    items.filter((t) => t.slug !== slug),
  );
}

export async function getRegistrations(filter?: {
  tournamentSlug?: string;
  clubSlug?: string;
}): Promise<Registration[]> {
  let items = await readCollection("registrations");
  if (filter?.tournamentSlug) {
    items = items.filter((r) => r.tournamentSlug === filter.tournamentSlug);
  }
  if (filter?.clubSlug) {
    items = items.filter((r) => r.clubSlug === filter.clubSlug);
  }
  return items.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
}

export async function getRegistration(id: string): Promise<Registration | null> {
  const items = await readCollection("registrations");
  return items.find((r) => r.id === id) ?? null;
}

export async function saveRegistration(registration: Registration): Promise<void> {
  const items = await readCollection("registrations");
  const idx = items.findIndex((r) => r.id === registration.id);
  const next = { ...registration, updatedAt: new Date().toISOString() };
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  await writeCollection("registrations", items);
}

export async function getClubs(): Promise<ClubProfile[]> {
  const items = await readCollection("clubs");
  return items.sort(
    (a, b) => a.pueblo.localeCompare(b.pueblo) || a.displayName.localeCompare(b.displayName),
  );
}

export async function getClub(clubSlug: string): Promise<ClubProfile | null> {
  const items = await readCollection("clubs");
  return items.find((c) => c.clubSlug === clubSlug) ?? null;
}

export async function saveClub(club: ClubProfile): Promise<void> {
  const items = await readCollection("clubs");
  const idx = items.findIndex((c) => c.clubSlug === club.clubSlug);
  const next = { ...club, updatedAt: new Date().toISOString() };
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  await writeCollection("clubs", items);
}

export async function getRosters(filter?: { clubSlug?: string }): Promise<TeamRoster[]> {
  let items = await readCollection("rosters");
  if (filter?.clubSlug) items = items.filter((r) => r.clubSlug === filter.clubSlug);
  return items;
}

export async function getRoster(id: string): Promise<TeamRoster | null> {
  const items = await readCollection("rosters");
  return items.find((r) => r.id === id) ?? null;
}

export async function getRosterByRegistration(
  registrationId: string,
): Promise<TeamRoster | null> {
  const items = await readCollection("rosters");
  return items.find((r) => r.registrationId === registrationId) ?? null;
}

export async function saveRoster(roster: TeamRoster): Promise<void> {
  const items = await readCollection("rosters");
  const idx = items.findIndex((r) => r.id === roster.id);
  const next = { ...roster, updatedAt: new Date().toISOString() };
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  await writeCollection("rosters", items);
}

export async function getAdmins(): Promise<AdminUser[]> {
  return readCollection("admins");
}
