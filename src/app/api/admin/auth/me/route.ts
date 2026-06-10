import { NextResponse } from "next/server";
import { getCurrentDbAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error de sesión.";
    if (message.includes("ADMIN_SESSION_SECRET")) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "ADMIN_SESSION_SECRET no está configurado en este deploy. Agrégalo en Vercel → Environment Variables (proyecto admin).",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
