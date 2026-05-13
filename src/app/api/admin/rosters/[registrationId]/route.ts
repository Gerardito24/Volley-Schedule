import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { TeamRoster } from "@/lib/team-roster-types";
import {
  getDbRosterByRegistrationId,
  upsertDbRoster,
} from "@/server/rosters-repo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ registrationId: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { registrationId } = await params;
  const roster = await getDbRosterByRegistrationId(
    decodeURIComponent(registrationId),
  );
  if (!roster) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, roster });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ registrationId: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { registrationId } = await params;
  const roster = (await req.json()) as TeamRoster;
  const saved = await upsertDbRoster({
    ...roster,
    registrationId: roster.registrationId || decodeURIComponent(registrationId),
  });
  return NextResponse.json({ ok: true, roster: saved });
}
