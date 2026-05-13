import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tournaments } from "@/db/schema";
import type { TournamentMock } from "@/lib/mock-data";
import { normalizeTournament } from "@/lib/mock-data";
import { dateStringToDate } from "@/server/db-utils";

export async function listDbTournaments(): Promise<TournamentMock[]> {
  const rows = await db.select().from(tournaments).orderBy(desc(tournaments.updatedAt));
  return rows.map((r) => normalizeTournament(r.payload));
}

export async function listPublicDbTournaments(): Promise<TournamentMock[]> {
  const rows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.isPublic, true))
    .orderBy(desc(tournaments.updatedAt));
  return rows.map((r) => normalizeTournament(r.payload));
}

export async function getDbTournamentBySlug(
  slug: string,
): Promise<TournamentMock | null> {
  const rows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);
  return rows[0]?.payload ? normalizeTournament(rows[0].payload) : null;
}

export async function upsertDbTournament(
  tournament: TournamentMock,
): Promise<TournamentMock> {
  const normalized = normalizeTournament(tournament);
  const now = new Date();
  await db
    .insert(tournaments)
    .values({
      slug: normalized.slug,
      name: normalized.name,
      status: normalized.status,
      startsOn: dateStringToDate(normalized.tournamentStartsOn),
      endsOn: dateStringToDate(normalized.tournamentEndsOn),
      isPublic: !normalized.hiddenFromPublic,
      payload: normalized,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: tournaments.slug,
      set: {
        name: normalized.name,
        status: normalized.status,
        startsOn: dateStringToDate(normalized.tournamentStartsOn),
        endsOn: dateStringToDate(normalized.tournamentEndsOn),
        isPublic: !normalized.hiddenFromPublic,
        payload: normalized,
        updatedAt: now,
      },
    });
  return normalized;
}
