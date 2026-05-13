import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { ClubProfile } from "@/lib/club-profile-types";
import {
  listDbClubProfiles,
  upsertDbClubProfile,
} from "@/server/club-profiles-repo";

export async function GET() {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const profiles = await listDbClubProfiles();
  return NextResponse.json({ ok: true, profiles });
}

export async function POST(req: Request) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const profile = (await req.json()) as ClubProfile;
  const saved = await upsertDbClubProfile(profile);
  return NextResponse.json({ ok: true, profile: saved });
}
