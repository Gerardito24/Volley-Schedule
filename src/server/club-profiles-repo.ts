import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clubProfiles } from "@/db/schema";
import type { ClubProfile } from "@/lib/club-profile-types";

export async function listDbClubProfiles(): Promise<ClubProfile[]> {
  const rows = await db.select().from(clubProfiles);
  return rows.map((r) => r.payload);
}

export async function getDbClubProfile(
  clubSlug: string,
): Promise<ClubProfile | null> {
  const rows = await db
    .select()
    .from(clubProfiles)
    .where(eq(clubProfiles.clubSlug, clubSlug))
    .limit(1);
  return rows[0]?.payload ?? null;
}

export async function upsertDbClubProfile(
  profile: ClubProfile,
): Promise<ClubProfile> {
  const now = new Date();
  await db
    .insert(clubProfiles)
    .values({
      clubSlug: profile.clubSlug,
      displayName: profile.displayName,
      payload: profile,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: clubProfiles.clubSlug,
      set: {
        displayName: profile.displayName,
        payload: profile,
        updatedAt: now,
      },
    });
  return profile;
}
