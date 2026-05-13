import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teamRosters } from "@/db/schema";
import type { TeamRoster } from "@/lib/team-roster-types";
import { slugify } from "@/lib/slugify";

export async function listDbRosters(): Promise<TeamRoster[]> {
  const rows = await db.select().from(teamRosters);
  return rows.map((r) => r.payload);
}

export async function getDbRosterByRegistrationId(
  registrationId: string,
): Promise<TeamRoster | null> {
  const rows = await db
    .select()
    .from(teamRosters)
    .where(eq(teamRosters.registrationId, registrationId))
    .limit(1);
  return rows[0]?.payload ?? null;
}

export async function upsertDbRoster(roster: TeamRoster): Promise<TeamRoster> {
  const now = new Date();
  const clubSlug = slugify(roster.clubName || roster.teamName);
  await db
    .insert(teamRosters)
    .values({
      registrationId: roster.registrationId,
      id: roster.id,
      clubSlug,
      tournamentSlug: roster.tournamentSlug,
      categoryId: roster.categoryId,
      payload: roster,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: teamRosters.registrationId,
      set: {
        id: roster.id,
        clubSlug,
        tournamentSlug: roster.tournamentSlug,
        categoryId: roster.categoryId,
        payload: roster,
        updatedAt: now,
      },
    });
  return roster;
}
