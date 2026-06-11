import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { deleteTournament, getTournament, saveTournament } from "@/lib/store";
import type { Tournament } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ tournament });
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { slug } = await params;
  const existing = await getTournament(slug);
  if (!existing) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Partial<Tournament> | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const updated: Tournament = {
    ...existing,
    ...body,
    slug: existing.slug, // el slug no cambia
    createdAt: existing.createdAt,
  };
  await saveTournament(updated);
  return NextResponse.json({ tournament: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { slug } = await params;
  await deleteTournament(slug);
  return NextResponse.json({ ok: true });
}
