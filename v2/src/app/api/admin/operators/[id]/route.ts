import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth";
import { deleteAdministrator, updateAdministrator } from "@/lib/admin-operators";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await getSessionAdmin();
  if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { displayName?: string; position?: string; username?: string; password?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const result = await updateAdministrator(actor, id, {
    displayName: body.displayName,
    position: body.position,
    username: body.username,
    password: body.password,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await getSessionAdmin();
  if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const result = await deleteAdministrator(actor, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
