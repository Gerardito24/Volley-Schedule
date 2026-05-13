import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { registrations } from "@/db/schema";
import type { RegistrationRowMock } from "@/lib/mock-data";
import { isoStringToDate } from "@/server/db-utils";

function normalizeRegistration(row: RegistrationRowMock): RegistrationRowMock {
  return {
    ...row,
    clubName: row.clubName || row.teamName,
  };
}

export async function listDbRegistrations(): Promise<RegistrationRowMock[]> {
  const rows = await db.select().from(registrations);
  return rows.map((r) => normalizeRegistration(r.payload));
}

export async function listDbRegistrationsByTournament(
  tournamentSlug: string,
): Promise<RegistrationRowMock[]> {
  const rows = await db
    .select()
    .from(registrations)
    .where(eq(registrations.tournamentSlug, tournamentSlug));
  return rows.map((r) => normalizeRegistration(r.payload));
}

export async function getDbRegistrationById(
  id: string,
): Promise<RegistrationRowMock | null> {
  const rows = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1);
  return rows[0]?.payload ? normalizeRegistration(rows[0].payload) : null;
}

export async function upsertDbRegistration(
  row: RegistrationRowMock,
): Promise<RegistrationRowMock> {
  const normalized = normalizeRegistration(row);
  const savedAt = new Date();
  await db
    .insert(registrations)
    .values({
      id: normalized.id,
      tournamentSlug: normalized.tournamentSlug,
      status: normalized.status,
      registeredAt: isoStringToDate(normalized.registeredAt),
      updatedAt: isoStringToDate(normalized.updatedAt),
      clubName: normalized.clubName,
      teamName: normalized.teamName,
      categoryId: normalized.categoryId,
      subdivisionId: normalized.subdivisionId ?? null,
      feeCents: normalized.feeCents,
      payload: normalized,
      savedAt,
    })
    .onConflictDoUpdate({
      target: registrations.id,
      set: {
        tournamentSlug: normalized.tournamentSlug,
        status: normalized.status,
        registeredAt: isoStringToDate(normalized.registeredAt),
        updatedAt: isoStringToDate(normalized.updatedAt),
        clubName: normalized.clubName,
        teamName: normalized.teamName,
        categoryId: normalized.categoryId,
        subdivisionId: normalized.subdivisionId ?? null,
        feeCents: normalized.feeCents,
        payload: normalized,
        savedAt,
      },
    });
  return normalized;
}
