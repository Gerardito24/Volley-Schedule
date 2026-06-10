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
  const adminCount = await countDbAdminUsers();
  return NextResponse.json({
    ok: true,
    configured: true,
    needsSetup: adminCount === 0,
    adminCount,
  });
}
