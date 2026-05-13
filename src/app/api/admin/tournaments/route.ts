import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { TournamentMock } from "@/lib/mock-data";
import {
  listDbTournaments,
  upsertDbTournament,
} from "@/server/tournaments-repo";

export async function GET() {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const tournaments = await listDbTournaments();
  return NextResponse.json({ ok: true, tournaments });
}

export async function POST(req: Request) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const tournament = (await req.json()) as TournamentMock;
  const saved = await upsertDbTournament(tournament);
  return NextResponse.json({ ok: true, tournament: saved });
}
