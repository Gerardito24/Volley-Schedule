import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { AdminOperator } from "@/lib/admin-operator-types";
import { hashPassword, toPublic } from "@/lib/admin-operators-store";
import {
  isAdminUsernameTaken,
  listDbAdminUsers,
  upsertDbAdminUser,
} from "@/server/admin-users-repo";

export async function GET() {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const list = await listDbAdminUsers();
  return NextResponse.json({ ok: true, operators: list.map(toPublic) });
}

export async function POST(req: Request) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  if (gate.role !== "it_master" && gate.role !== "administrator") {
    return NextResponse.json({ ok: false, message: "Sin permiso." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    displayName?: unknown;
    position?: unknown;
    username?: unknown;
    password?: unknown;
  } | null;

  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const position = typeof body?.position === "string" ? body.position.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!displayName || !position || !username) {
    return NextResponse.json(
      { ok: false, message: "Nombre, posición y usuario son obligatorios." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, message: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 },
    );
  }
  if (await isAdminUsernameTaken(username)) {
    return NextResponse.json(
      { ok: false, message: "Ese nombre de usuario ya está en uso." },
      { status: 400 },
    );
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `adm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const op: AdminOperator = {
    id,
    displayName,
    position,
    username,
    passwordHash: hashPassword(password),
    role: "administrator",
    createdAt: new Date().toISOString(),
  };

  await upsertDbAdminUser(op);
  return NextResponse.json({ ok: true, operator: toPublic(op) });
}
