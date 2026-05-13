import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";
import { getCurrentDbAdmin } from "@/lib/admin-auth";
import type { AdminOperator } from "@/lib/admin-operator-types";

/**
 * When `DATABASE_URL` is set, admin JSON routes require a valid HttpOnly session.
 * Without a configured DB the app stays local-first and these routes return 503.
 */
export async function guardAdminApi(): Promise<AdminOperator | NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Base de datos no configurada." },
      { status: 503 },
    );
  }
  const admin = await getCurrentDbAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, message: "Sesión requerida." }, { status: 401 });
  }
  return admin;
}
