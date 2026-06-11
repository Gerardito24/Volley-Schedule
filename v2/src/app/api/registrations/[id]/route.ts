import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { getRegistration, saveRegistration } from "@/lib/store";
import type { Registration } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const registration = await getRegistration(id);
  if (!registration) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ registration });
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const existing = await getRegistration(id);
  if (!existing) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Partial<Registration> | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const updated: Registration = {
    ...existing,
    ...body,
    id: existing.id,
    tournamentSlug: existing.tournamentSlug,
    registeredAt: existing.registeredAt,
  };
  await saveRegistration(updated);
  return NextResponse.json({ registration: updated });
}
