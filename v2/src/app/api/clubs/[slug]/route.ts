import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getClub, saveClub } from "@/lib/store";
import type { ClubProfile } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { slug } = await params;
  const existing = await getClub(slug);
  if (!existing) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Partial<ClubProfile> | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const updated: ClubProfile = { ...existing, ...body, clubSlug: existing.clubSlug };
  await saveClub(updated);
  return NextResponse.json({ club: updated });
}
