import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { listPublicDbTournaments } from "@/server/tournaments-repo";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, tournaments: [] });
  }
  const tournaments = await listPublicDbTournaments();
  return NextResponse.json({ ok: true, tournaments });
}
