import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { getClient } from "./store";
import type { Client } from "./types";

export const CLIENT_SESSION_COOKIE = "volleyv2_client";
const SECRET =
  process.env.CLIENT_SESSION_SECRET ?? "volleyv2-client-dev-secret-change-in-prod";

// ---------------------------------------------------------------------------
// Hashing de contraseñas (scrypt — memory-hard, adecuado para passwords)
// ---------------------------------------------------------------------------

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(key, "hex");
  if (derived.length !== storedKey.length) return false;
  return timingSafeEqual(derived, storedKey);
}

// ---------------------------------------------------------------------------
// Tokens de sesión (firma HMAC sobre el clientId)
// ---------------------------------------------------------------------------

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createClientToken(clientId: string): string {
  return `${clientId}.${sign(clientId)}`;
}

export function verifyClientToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const clientId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(clientId);
  if (sig.length !== expected.length) return false as unknown as null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return clientId;
}

// ---------------------------------------------------------------------------
// Sesión del cliente actual (server-side)
// ---------------------------------------------------------------------------

export async function getSessionClient(): Promise<Client | null> {
  const store = await cookies();
  const clientId = verifyClientToken(store.get(CLIENT_SESSION_COOKIE)?.value);
  if (!clientId) return null;
  return getClient(clientId);
}
