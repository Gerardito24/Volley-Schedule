import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { setAdminSession } from "@/lib/admin-auth";
import { toPublic } from "@/lib/admin-operators-store";
import { countDbAdminUsers } from "@/server/admin-users-repo";
import { createItMasterInDb } from "@/server/create-it-master-db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      needsSetup: false,
      adminCount: 0,
    });
  }
  const adminCount = await countDbAdminUsers();
  return NextResponse.json({
    ok: true,
    configured: true,
    needsSetup: adminCount === 0,
    adminCount,
  });
}

type SetupBody = {
  username?: unknown;
  password?: unknown;
  organizerEmail?: unknown;
};

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Base de datos no configurada." },
      { status: 503 },
    );
  }

  const adminCount = await countDbAdminUsers();
  if (adminCount > 0) {
    return NextResponse.json(
      { ok: false, message: "La configuración inicial ya fue completada." },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => null)) as SetupBody | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const organizerEmail =
    typeof body?.organizerEmail === "string" ? body.organizerEmail : undefined;

  const result = await createItMasterInDb(username, password, organizerEmail);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  await setAdminSession(result.operator.username);
  return NextResponse.json({
    ok: true,
    operator: toPublic(result.operator),
  });
}
