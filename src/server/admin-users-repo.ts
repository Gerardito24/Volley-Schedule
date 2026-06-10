import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import type { AdminOperator } from "@/lib/admin-operator-types";
import { IT_MASTER_DISPLAY_NAME, IT_MASTER_POSITION } from "@/lib/admin-operator-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listDbAdminUsers(): Promise<AdminOperator[]> {
  const rows = await db.select().from(adminUsers);
  return rows.map((r) => r.payload);
}

export async function countDbAdminUsers(): Promise<number> {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(adminUsers);
  return rows[0]?.n ?? 0;
}

export async function hasDbItMaster(): Promise<boolean> {
  const rows = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.role, "it_master"))
    .limit(1);
  return rows.length > 0;
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

function normalizeItMasterPayload(op: AdminOperator): AdminOperator {
  if (op.role !== "it_master") return op;
  return {
    ...op,
    displayName: IT_MASTER_DISPLAY_NAME,
    position: IT_MASTER_POSITION,
  };
}

export async function upsertDbAdminUser(op: AdminOperator): Promise<AdminOperator> {
  const normalized = normalizeItMasterPayload(op);
  if (normalized.role === "it_master") {
    const existingMaster = await hasDbItMaster();
    if (existingMaster) {
      const current = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.role, "it_master"))
        .limit(1);
      const currentPayloadId = current[0]?.payload.id;
      if (currentPayloadId !== normalized.id) {
        throw new Error("Solo puede existir un perfil IT maestro.");
      }
    }
  }

  const now = new Date();
  await db
    .insert(adminUsers)
    .values({
      id: normalized.id === "it-master" ? undefined : normalized.id,
      username: normalized.username.trim().toLowerCase(),
      email: normalized.organizerEmail ?? null,
      displayName: normalized.displayName,
      position: normalized.position,
      passwordHash: normalized.passwordHash,
      role: normalized.role,
      payload: normalized,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: adminUsers.username,
      set: {
        email: normalized.organizerEmail ?? null,
        displayName: normalized.displayName,
        position: normalized.position,
        passwordHash: normalized.passwordHash,
        role: normalized.role,
        payload: normalized,
        updatedAt: now,
      },
    });
  return normalized;
}
