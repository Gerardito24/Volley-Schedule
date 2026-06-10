import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { countDbAdminUsers } from "@/server/admin-users-repo";

export async function GET() {
  const configured = isDatabaseConfigured();
  if (!configured) {
    return NextResponse.json({
      ok: true,
      configured: false,
      needsSetup: false,
      adminCount: 0,
    });
  }
  try {
    const adminCount = await countDbAdminUsers();
    return NextResponse.json({
      ok: true,
      configured: true,
      needsSetup: adminCount === 0,
      adminCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database query failed.";
    return NextResponse.json(
      {
        ok: false,
        message: `No se pudo consultar la base de datos. Revisa DATABASE_URL y ejecuta npm run db:migrate. (${message})`,
      },
      { status: 503 },
    );
  }
}
