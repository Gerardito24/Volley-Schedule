import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { importBatches } from "@/db/schema";
import type { ImportBatch } from "@/lib/local-import-batches";
import { isoStringToDate } from "@/server/db-utils";

export async function listDbImportBatches(): Promise<ImportBatch[]> {
  const rows = await db.select().from(importBatches);
  return rows.map((r) => r.payload);
}

export async function upsertDbImportBatch(
  batch: ImportBatch,
  kind = "registrations",
): Promise<ImportBatch> {
  await db
    .insert(importBatches)
    .values({
      id: batch.id,
      kind,
      fileName: batch.fileName,
      payload: batch,
      createdAt: isoStringToDate(batch.uploadedAt) ?? new Date(),
    })
    .onConflictDoUpdate({
      target: importBatches.id,
      set: {
        kind,
        fileName: batch.fileName,
        payload: batch,
      },
    });
  return batch;
}

export async function deleteDbImportBatch(id: string): Promise<void> {
  await db.delete(importBatches).where(eq(importBatches.id, id));
}
