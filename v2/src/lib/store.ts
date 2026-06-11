import type {
  AdminUser,
  Client,
  ClubProfile,
  Registration,
  TeamRoster,
  Tournament,
} from "./types";
import { buildSeedData } from "./seed";
import { sql } from "./db";

// Almacenamiento en Postgres. Cada colección es una tabla `vh_<name>` con
// (id text PRIMARY KEY, data jsonb). El prefijo `vh_` evita chocar con las
// tablas del app de producción si se comparte la misma base de datos.
// Las tablas se crean y se siembran (datos demo) automáticamente la primera
// vez, igual que hacía la versión basada en archivos JSON.

type CollectionName =
  | "tournaments"
  | "registrations"
  | "clubs"
  | "rosters"
  | "admins"
  | "clients";

interface CollectionTypes {
  tournaments: Tournament;
  registrations: Registration;
  clubs: ClubProfile;
  rosters: TeamRoster;
  admins: AdminUser;
  clients: Client;
}

const COLLECTIONS: CollectionName[] = [
  "tournaments",
  "registrations",
  "clubs",
  "rosters",
  "admins",
  "clients",
];

function tableFor(name: CollectionName): string {
  return `vh_${name}`;
}

/** Clave primaria natural de cada colección. */
function keyOf<N extends CollectionName>(
  name: N,
  item: CollectionTypes[N],
): string {
  switch (name) {
    case "tournaments":
      return (item as Tournament).slug;
    case "clubs":
      return (item as ClubProfile).clubSlug;
    default:
      // registrations, rosters, admins
      return (item as { id: string }).id;
  }
}

let ready: Promise<void> | null = null;

/** Reemplaza el contenido completo de una colección en una transacción. */
async function replaceAll<N extends CollectionName>(
  name: N,
  items: CollectionTypes[N][],
): Promise<void> {
  const table = tableFor(name);
  await sql.begin(async (tx) => {
    await tx`DELETE FROM ${tx(table)}`;
    for (const item of items) {
      await tx`
        INSERT INTO ${tx(table)} (id, data)
        VALUES (${keyOf(name, item)}, ${tx.json(
          item as unknown as Parameters<typeof tx.json>[0],
        )})
      `;
    }
  });
}

/** Crea las tablas si faltan y siembra datos demo si están vacías. */
async function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    for (const name of COLLECTIONS) {
      const table = tableFor(name);
      await sql`
        CREATE TABLE IF NOT EXISTS ${sql(table)} (
          id text PRIMARY KEY,
          data jsonb NOT NULL
        )
      `;
    }
    const counted = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM ${sql(tableFor("tournaments"))}
    `;
    if (counted[0]?.count === 0) {
      const seed = buildSeedData();
      await replaceAll("tournaments", seed.tournaments);
      await replaceAll("registrations", seed.registrations);
      await replaceAll("clubs", seed.clubs);
      await replaceAll("rosters", seed.rosters);
      await replaceAll("admins", seed.admins);
    }
  })().catch((err) => {
    // Permitir reintentar el bootstrap en la próxima petición si algo falló.
    ready = null;
    throw err;
  });
  return ready;
}

export async function readCollection<N extends CollectionName>(
  name: N,
): Promise<CollectionTypes[N][]> {
  await ensureReady();
  const rows = await sql<{ data: CollectionTypes[N] }[]>`
    SELECT data FROM ${sql(tableFor(name))}
  `;
  return rows.map((row) => row.data);
}

export async function writeCollection<N extends CollectionName>(
  name: N,
  items: CollectionTypes[N][],
): Promise<void> {
  await ensureReady();
  await replaceAll(name, items);
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

// ---------------------------------------------------------------------------
// Clientes (cuentas públicas)
// ---------------------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
  return readCollection("clients");
}

export async function getClient(id: string): Promise<Client | null> {
  const items = await readCollection("clients");
  return items.find((c) => c.id === id) ?? null;
}

export async function getClientByEmail(email: string): Promise<Client | null> {
  const items = await readCollection("clients");
  return items.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function saveClient(client: Client): Promise<void> {
  const items = await readCollection("clients");
  const idx = items.findIndex((c) => c.id === client.id);
  const next = { ...client, updatedAt: new Date().toISOString() };
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  await writeCollection("clients", items);
}
