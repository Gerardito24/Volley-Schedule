import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import type { AdminOperator } from "@/lib/admin-operator-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listDbAdminUsers(): Promise<AdminOperator[]> {
  const rows = await db.select().from(adminUsers);
  return rows.map((r) => r.payload);
}

export async function getDbAdminUserByUsername(
  username: string,
): Promise<AdminOperator | null> {
  const u = username.trim().toLowerCase();
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, u))
    .limit(1);
  return rows[0]?.payload ?? null;
}

export async function getDbAdminUserById(id: string): Promise<AdminOperator | null> {
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return rows[0]?.payload ?? null;
}

/** Resolve by row UUID or by `payload.id` (e.g. it-master). */
export async function getDbAdminUserByOperatorId(
  operatorId: string,
): Promise<AdminOperator | null> {
  if (UUID_RE.test(operatorId)) {
    const byUuid = await getDbAdminUserById(operatorId);
    if (byUuid) return byUuid;
  }
  const rows = await db
    .select()
    .from(adminUsers)
    .where(sql`${adminUsers.payload}->>'id' = ${operatorId}`)
    .limit(1);
  return rows[0]?.payload ?? null;
}

export async function isAdminUsernameTaken(
  username: string,
  excludeOperatorPayloadId?: string,
): Promise<boolean> {
  const existing = await getDbAdminUserByUsername(username);
  if (!existing) return false;
  if (excludeOperatorPayloadId && existing.id === excludeOperatorPayloadId) return false;
  return true;
}

export async function deleteDbAdminUserByOperatorId(operatorId: string): Promise<boolean> {
  if (UUID_RE.test(operatorId)) {
    const del = await db.delete(adminUsers).where(eq(adminUsers.id, operatorId)).returning({ id: adminUsers.id });
    if (del.length > 0) return true;
  }
  const del = await db
    .delete(adminUsers)
    .where(sql`${adminUsers.payload}->>'id' = ${operatorId}`)
    .returning({ id: adminUsers.id });
  return del.length > 0;
}

export async function upsertDbAdminUser(op: AdminOperator): Promise<AdminOperator> {
  const now = new Date();
  await db
    .insert(adminUsers)
    .values({
      id: op.id === "it-master" ? undefined : op.id,
      username: op.username.trim().toLowerCase(),
      email: op.organizerEmail ?? null,
      displayName: op.displayName,
      position: op.position,
      passwordHash: op.passwordHash,
      role: op.role,
      payload: op,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: adminUsers.username,
      set: {
        email: op.organizerEmail ?? null,
        displayName: op.displayName,
        position: op.position,
        passwordHash: op.passwordHash,
        role: op.role,
        payload: op,
        updatedAt: now,
      },
    });
  return op;
}
