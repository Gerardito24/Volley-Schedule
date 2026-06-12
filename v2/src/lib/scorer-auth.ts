import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { scrypt } from "crypto";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt);

const SECRET =
  process.env.CLIENT_SESSION_SECRET ?? "volleyv2-scorer-dev-secret-change-in-prod";

const COOKIE_MAX_AGE = 60 * 60 * 10; // 10 horas

// ---------------------------------------------------------------------------
// PIN hashing (scrypt)
// ---------------------------------------------------------------------------

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(pin, salt, 32)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  try {
    const derived = (await scryptAsync(pin, salt, 32)) as Buffer;
    const storedBuf = Buffer.from(hash, "hex");
    if (derived.length !== storedBuf.length) return false;
    return timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sesión de anotador — cookie HMAC por link
// ---------------------------------------------------------------------------

function cookieName(linkId: string): string {
  return `volleyv2_scorer_${linkId}`;
}

function sign(linkId: string): string {
  return createHmac("sha256", SECRET).update(`scorer:${linkId}`).digest("hex");
}

function verifySignature(value: string, linkId: string): boolean {
  const expected = sign(linkId);
  if (value.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function createScorerSession(linkId: string): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(linkId), sign(linkId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function verifyScorerSession(linkId: string): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(cookieName(linkId));
  if (!cookie) return false;
  return verifySignature(cookie.value, linkId);
}
