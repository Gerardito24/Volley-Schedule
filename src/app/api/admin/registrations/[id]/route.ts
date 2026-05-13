import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { RegistrationRowMock } from "@/lib/mock-data";
import {
  getDbRegistrationById,
  upsertDbRegistration,
} from "@/server/registrations-repo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const registration = await getDbRegistrationById(decodeURIComponent(id));
  if (!registration) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, registration });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const registration = (await req.json()) as RegistrationRowMock;
  const saved = await upsertDbRegistration({
    ...registration,
    id: registration.id || decodeURIComponent(id),
  });
  return NextResponse.json({ ok: true, registration: saved });
}
