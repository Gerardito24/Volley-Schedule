import { NextResponse } from "next/server";
import { getCurrentDbAdmin } from "@/lib/admin-auth";

export async function GET() {
  const op = await getCurrentDbAdmin();
  if (!op) return NextResponse.json({ ok: true, operator: null });
  return NextResponse.json({
    ok: true,
    operator: {
      id: op.id,
      displayName: op.displayName,
      position: op.position,
      username: op.username,
      role: op.role,
      createdAt: op.createdAt,
      organizerEmail: op.organizerEmail,
    },
  });
}
