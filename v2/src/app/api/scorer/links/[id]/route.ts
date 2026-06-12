import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { deleteScorerLink, getScorerLink } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const link = await getScorerLink(id);
  if (!link) return NextResponse.json({ error: "No existe" }, { status: 404 });

  await deleteScorerLink(id);
  return NextResponse.json({ ok: true });
}
