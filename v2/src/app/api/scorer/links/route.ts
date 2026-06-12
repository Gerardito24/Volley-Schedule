import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionAdmin } from "@/lib/auth";
import { getScorerLinks, saveScorerLink } from "@/lib/store";
import { hashPin } from "@/lib/scorer-auth";

export async function GET(request: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tournamentSlug = searchParams.get("tournamentSlug");
  if (!tournamentSlug) return NextResponse.json({ error: "Falta tournamentSlug" }, { status: 400 });

  const links = await getScorerLinks({ tournamentSlug });
  // No devolver pinHash al cliente
  const safe = links.map(({ pinHash: _, ...l }) => l);
  return NextResponse.json({ links: safe });
}

export async function POST(request: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    tournamentSlug?: string;
    name?: string;
    pin?: string;
  } | null;

  if (!body?.tournamentSlug || !body?.name?.trim() || !body?.pin) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!/^\d{4}$/.test(body.pin)) {
    return NextResponse.json({ error: "El PIN debe ser exactamente 4 dígitos" }, { status: 400 });
  }

  const link = {
    id: randomUUID(),
    tournamentSlug: body.tournamentSlug,
    name: body.name.trim(),
    pinHash: await hashPin(body.pin),
    createdAt: new Date().toISOString(),
  };
  await saveScorerLink(link);

  const { pinHash: _, ...safe } = link;
  return NextResponse.json({ link: safe }, { status: 201 });
}
