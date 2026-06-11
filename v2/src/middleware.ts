import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// v2 maneja la auth de admin en server components y API routes (src/lib/auth.ts).
// No necesita middleware de superficie — matcher vacío = no intercepta nada.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
