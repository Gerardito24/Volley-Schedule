import { NextResponse } from "next/server";
import {
  verifyPassword,
  createClientToken,
  CLIENT_SESSION_COOKIE,
} from "@/lib/client-auth";
import { getClientByEmail } from "@/lib/store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { email, password } = body as Record<string, string>;
  if (!email || !password) {
    return NextResponse.json({ error: "Correo y contraseña requeridos" }, { status: 400 });
  }

  const client = await getClientByEmail(email.trim());
  if (!client || !(await verifyPassword(password, client.passwordHash))) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  const token = createClientToken(client.id);
  const res = NextResponse.json({
    client: { id: client.id, email: client.email, displayName: client.displayName },
  });
  res.cookies.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
