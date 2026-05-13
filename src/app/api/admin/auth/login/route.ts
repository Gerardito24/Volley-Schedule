import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { loginAdmin, setAdminSession } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Inicio de sesión en servidor no disponible sin base de datos." },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const op = await loginAdmin(username, password);
  if (!op) {
    return NextResponse.json(
      { ok: false, message: "Usuario o contraseña incorrectos." },
      { status: 401 },
    );
  }
  await setAdminSession(op.username);
  return NextResponse.json({
    ok: true,
    operator: {
      id: op.id,
      displayName: op.displayName,
      position: op.position,
      username: op.username,
      role: op.role,
    },
  });
}
