import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { TeamRoster } from "@/lib/team-roster-types";
import { listDbRosters, upsertDbRoster } from "@/server/rosters-repo";

export async function GET() {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const rosters = await listDbRosters();
  return NextResponse.json({ ok: true, rosters });
}

export async function POST(req: Request) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const roster = (await req.json()) as TeamRoster;
  const saved = await upsertDbRoster(roster);
  return NextResponse.json({ ok: true, roster: saved });
}
