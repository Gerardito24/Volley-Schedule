import { NextResponse } from "next/server";
import { getAdmins } from "@/lib/store";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword } from "@/lib/seed";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
  }
  const admins = await getAdmins();
  const admin = admins.find(
    (a) => a.username.toLowerCase() === body.username!.trim().toLowerCase(),
  );
  if (!admin || admin.passwordHash !== hashPassword(body.password)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }
  const res = NextResponse.json({
    ok: true,
    admin: { id: admin.id, displayName: admin.displayName, role: admin.role },
  });
  res.cookies.set(SESSION_COOKIE, createSessionToken(admin.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
