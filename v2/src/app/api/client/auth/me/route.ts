import { NextResponse } from "next/server";
import { getSessionClient } from "@/lib/client-auth";

export async function GET() {
  const client = await getSessionClient();
  if (!client) return NextResponse.json({ client: null });
  return NextResponse.json({
    client: { id: client.id, email: client.email, displayName: client.displayName, phone: client.phone },
  });
}
