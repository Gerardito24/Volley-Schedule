import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { ImportBatch } from "@/lib/local-import-batches";
import {
  listDbImportBatches,
  upsertDbImportBatch,
} from "@/server/import-batches-repo";

export async function GET() {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const batches = await listDbImportBatches();
  return NextResponse.json({ ok: true, batches });
}

export async function POST(req: Request) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const batch = (await req.json()) as ImportBatch;
  const saved = await upsertDbImportBatch(batch);
  return NextResponse.json({ ok: true, batch: saved });
}
