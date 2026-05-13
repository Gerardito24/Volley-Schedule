import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { TournamentMock } from "@/lib/mock-data";
import {
  getDbTournamentBySlug,
  upsertDbTournament,
} from "@/server/tournaments-repo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { slug } = await params;
  const tournament = await getDbTournamentBySlug(decodeURIComponent(slug));
  if (!tournament) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, tournament });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { slug } = await params;
  const tournament = (await req.json()) as TournamentMock;
  const saved = await upsertDbTournament({
    ...tournament,
    slug: tournament.slug || decodeURIComponent(slug),
  });
  return NextResponse.json({ ok: true, tournament: saved });
}
