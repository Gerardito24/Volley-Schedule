import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { AdminOperator } from "@/lib/admin-operator-types";
import type { ClubProfile } from "@/lib/club-profile-types";
import type { ImportBatch } from "@/lib/local-import-batches";
import type { RegistrationRowMock, TournamentMock } from "@/lib/mock-data";
import type { TeamRoster } from "@/lib/team-roster-types";
import { upsertDbAdminUser, listDbAdminUsers } from "@/server/admin-users-repo";
import { upsertDbClubProfile } from "@/server/club-profiles-repo";
import { upsertDbImportBatch } from "@/server/import-batches-repo";
import { upsertDbRegistration } from "@/server/registrations-repo";
import { upsertDbRoster } from "@/server/rosters-repo";
import { upsertDbTournament } from "@/server/tournaments-repo";

type ImportPayload = {
  tournaments?: TournamentMock[];
  registrations?: RegistrationRowMock[];
  rosters?: TeamRoster[];
  clubProfiles?: ClubProfile[];
  importBatches?: ImportBatch[];
  adminOperators?: AdminOperator[];
};

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Base de datos no configurada." },
      { status: 503 },
    );
  }

  const existingAdmins = await listDbAdminUsers();
  if (existingAdmins.length > 0) {
    const gate = await guardAdminApi();
    if (gate instanceof NextResponse) return gate;
  }

  const payload = (await req.json()) as ImportPayload;
  const counts = {
    tournaments: 0,
    registrations: 0,
    rosters: 0,
    clubProfiles: 0,
    importBatches: 0,
    adminOperators: 0,
  };

  for (const t of payload.tournaments ?? []) {
    await upsertDbTournament(t);
    counts.tournaments++;
  }
  for (const r of payload.registrations ?? []) {
    await upsertDbRegistration(r);
    counts.registrations++;
  }
  for (const r of payload.rosters ?? []) {
    await upsertDbRoster(r);
    counts.rosters++;
  }
  for (const p of payload.clubProfiles ?? []) {
    await upsertDbClubProfile(p);
    counts.clubProfiles++;
  }
  for (const b of payload.importBatches ?? []) {
    await upsertDbImportBatch(b);
    counts.importBatches++;
  }
  for (const op of payload.adminOperators ?? []) {
    await upsertDbAdminUser(op);
    counts.adminOperators++;
  }

  return NextResponse.json({ ok: true, counts });
}
