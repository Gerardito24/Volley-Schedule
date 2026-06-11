import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { deleteRoster, getRoster, saveRoster } from "@/lib/store";
import type { TeamRoster } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await getRoster(id);
  if (!existing) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Partial<TeamRoster> | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const updated: TeamRoster = {
    ...existing,
    ...body,
    id: existing.id,
    registrationId: existing.registrationId,
  };
  await saveRoster(updated);
  return NextResponse.json({ roster: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const existing = await getRoster(id);
  if (!existing) return NextResponse.json({ error: "No existe" }, { status: 404 });
  await deleteRoster(id);
  return NextResponse.json({ ok: true });
}
