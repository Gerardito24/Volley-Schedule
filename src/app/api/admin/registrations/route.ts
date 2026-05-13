import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { RegistrationRowMock } from "@/lib/mock-data";
import {
  listDbRegistrations,
  upsertDbRegistration,
} from "@/server/registrations-repo";

export async function GET() {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const registrations = await listDbRegistrations();
  return NextResponse.json({ ok: true, registrations });
}

export async function POST(req: Request) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const registration = (await req.json()) as RegistrationRowMock;
  const saved = await upsertDbRegistration(registration);
  return NextResponse.json({ ok: true, registration: saved });
}
