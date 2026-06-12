import { NextResponse } from "next/server";
import { getScorerLink } from "@/lib/store";
import { createScorerSession, verifyPin } from "@/lib/scorer-auth";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const link = await getScorerLink(token);
  if (!link) return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { pin?: string } | null;
  if (!body?.pin) return NextResponse.json({ error: "PIN requerido" }, { status: 400 });

  const ok = await verifyPin(body.pin, link.pinHash);
  if (!ok) return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });

  await createScorerSession(token);
  return NextResponse.json({ ok: true });
}
