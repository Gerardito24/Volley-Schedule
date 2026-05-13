import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AdminOperator } from "@/lib/admin-operator-types";
import { verifyPassword } from "@/lib/admin-operators-store";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session-constants";
import { getDbAdminUserByUsername } from "@/server/admin-users-repo";

export { ADMIN_SESSION_COOKIE };

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }
  return "dev-only-admin-session-secret-not-for-production";
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function encodeSession(username: string): string {
  const u = username.trim().toLowerCase();
  const payload = JSON.stringify({ username: u, issuedAt: Date.now() });
  const body = Buffer.from(payload, "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): { username: string } | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      username?: unknown;
      profileId?: unknown;
    };
    if (typeof parsed.username === "string" && parsed.username) {
      return { username: parsed.username.trim().toLowerCase() };
    }
    if (typeof parsed.profileId === "string" && parsed.profileId) {
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loginAdmin(
  username: string,
  password: string,
): Promise<AdminOperator | null> {
  const op = await getDbAdminUserByUsername(username);
  if (!op) return null;
  if (!verifyPassword(password, op.passwordHash)) return null;
  return op;
}

export async function setAdminSession(username: string): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, encodeSession(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_SESSION_COOKIE);
}

export async function getCurrentDbAdmin(): Promise<AdminOperator | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = decodeSession(token);
  if (!session) return null;
  return getDbAdminUserByUsername(session.username);
}

export async function requireDbAdmin(): Promise<AdminOperator> {
  const op = await getCurrentDbAdmin();
  if (!op) throw new Error("Admin session required.");
  return op;
}
