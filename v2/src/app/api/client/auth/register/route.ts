import { NextResponse } from "next/server";
import {
  hashPassword,
  createClientToken,
  CLIENT_SESSION_COOKIE,
} from "@/lib/client-auth";
import { getClientByEmail, saveClient } from "@/lib/store";
import type { Client } from "@/lib/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { email, displayName, phone, password } = body as Record<string, string>;

  if (!email?.trim() || !displayName?.trim() || !password) {
    return NextResponse.json(
      { error: "Correo, nombre y contraseña son requeridos" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 },
    );
  }

  const existing = await getClientByEmail(email.trim());
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese correo" },
      { status: 409 },
    );
  }

  const client: Client = {
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    displayName: displayName.trim(),
    phone: phone?.trim() || undefined,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveClient(client);

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
