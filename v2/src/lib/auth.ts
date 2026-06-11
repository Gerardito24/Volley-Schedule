import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAdmins } from "./store";
import type { AdminUser } from "./types";

// Demo local: secreto fijo. En producción iría en una variable de entorno.
const SECRET = "volleyv2-local-demo-secret";
export const SESSION_COOKIE = "volleyv2_admin";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSessionToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  const expected = sign(userId);
  if (signature.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return userId;
}

export async function getSessionAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const userId = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const admins = await getAdmins();
  return admins.find((a) => a.id === userId) ?? null;
}
