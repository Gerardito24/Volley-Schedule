import { NextResponse } from "next/server";
import { getScorerLink, getTournament, saveTournament } from "@/lib/store";
import { verifyScorerSession } from "@/lib/scorer-auth";
import type { MatchResult } from "@/lib/types";

type Params = { params: Promise<{ token: string; matchId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { token, matchId } = await params;

  const authed = await verifyScorerSession(token);
  if (!authed) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const link = await getScorerLink(token);
  if (!link) return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });

  const tournament = await getTournament(link.tournamentSlug);
  if (!tournament?.schedule) return NextResponse.json({ error: "Sin itinerario" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { result: MatchResult | null } | null;
  if (body === null) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  let found = false;
  const updatedCategories = tournament.schedule.categories.map((cat) => ({
    ...cat,
    matches: cat.matches.map((m) => {
      if (m.id !== matchId) return m;
      found = true;
      return { ...m, result: body.result };
    }),
  }));

  if (!found) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  await saveTournament({
    ...tournament,
    schedule: { ...tournament.schedule, categories: updatedCategories },
  });

  return NextResponse.json({ ok: true });
}
