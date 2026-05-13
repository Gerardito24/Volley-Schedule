import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/client";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: isDatabaseConfigured(),
  });
}
