import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { createAdministrator } from "@/lib/admin-operators";

export async function POST(request: Request) {
  const actor = await getSessionAdmin();
  if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { displayName?: string; position?: string; username?: string; password?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const result = await createAdministrator(actor, {
    displayName: String(body.displayName ?? ""),
    position: String(body.position ?? ""),
    username: String(body.username ?? ""),
    password: String(body.password ?? ""),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
