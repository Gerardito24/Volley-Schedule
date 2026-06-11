import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getTournament, getTournaments, saveTournament } from "@/lib/store";
import type { Tournament } from "@/lib/types";
import { slugify } from "@/lib/types";

export async function GET() {
  const tournaments = await getTournaments();
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Partial<Tournament> | null;
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  let slug = body.slug?.trim() || slugify(body.name);
  if (await getTournament(slug)) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const now = new Date().toISOString();
  const tournament: Tournament = {
    slug,
    name: body.name.trim(),
    description: body.description ?? "",
    venues: body.venues ?? [],
    registrationDeadlineOn: body.registrationDeadlineOn ?? "",
    startsOn: body.startsOn ?? "",
    endsOn: body.endsOn ?? "",
    baseFeeCents: body.baseFeeCents ?? null,
    publicEntryFeeCents: body.publicEntryFeeCents ?? null,
    promoImageDataUrl: body.promoImageDataUrl ?? null,
    status: body.status ?? "draft",
    divisions: body.divisions ?? [],
    categories: body.categories ?? [],
    schedule: null,
    createdAt: now,
    updatedAt: now,
  };
  await saveTournament(tournament);
  return NextResponse.json({ tournament }, { status: 201 });
}
