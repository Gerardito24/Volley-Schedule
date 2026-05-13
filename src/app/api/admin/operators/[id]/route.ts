import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-auth";
import { guardAdminApi } from "@/lib/admin-api-guard";
import type { AdminOperator } from "@/lib/admin-operator-types";
import { hashPassword, toPublic } from "@/lib/admin-operators-store";
import {
  deleteDbAdminUserByOperatorId,
  getDbAdminUserByOperatorId,
  isAdminUsernameTaken,
  upsertDbAdminUser,
} from "@/server/admin-users-repo";

const organizerEmailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PatchBody = {
  displayName?: unknown;
  position?: unknown;
  username?: unknown;
  password?: unknown;
  organizerEmail?: unknown;
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { id: rawId } = await params;
  const targetId = decodeURIComponent(rawId);
  const target = await getDbAdminUserByOperatorId(targetId);
  if (!target) {
    return NextResponse.json({ ok: false, message: "Perfil no encontrado." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null;

  if (target.role === "it_master") {
    if (gate.role !== "it_master" || gate.id !== target.id) {
      return NextResponse.json(
        { ok: false, message: "Solo el IT maestro puede editar su propio perfil." },
        { status: 403 },
      );
    }
    const nextUsername =
      typeof body?.username === "string" ? body.username.trim() : target.username;
    if (!nextUsername) {
      return NextResponse.json({ ok: false, message: "Usuario requerido." }, { status: 400 });
    }
    if (await isAdminUsernameTaken(nextUsername, target.id)) {
      return NextResponse.json(
        { ok: false, message: "Ese nombre de usuario ya está en uso." },
        { status: 400 },
      );
    }
    let organizerEmail = target.organizerEmail;
    if (body?.organizerEmail !== undefined) {
      const t = String(body.organizerEmail).trim();
      if (t && !organizerEmailRe.test(t)) {
        return NextResponse.json(
          { ok: false, message: "Correo del organizador no válido." },
          { status: 400 },
        );
      }
      organizerEmail = t || undefined;
    }
    const pwd = typeof body?.password === "string" ? body.password : "";
    if (pwd && pwd.length < 6) {
      return NextResponse.json(
        { ok: false, message: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      );
    }
    const next: AdminOperator = {
      ...target,
      username: nextUsername,
      passwordHash: pwd ? hashPassword(pwd) : target.passwordHash,
    };
    if (organizerEmail) {
      next.organizerEmail = organizerEmail;
    } else {
      delete next.organizerEmail;
    }
    await upsertDbAdminUser(next);
    return NextResponse.json({ ok: true, operator: toPublic(next) });
  }

  if (gate.role !== "it_master" && gate.role !== "administrator") {
    return NextResponse.json({ ok: false, message: "Sin permiso." }, { status: 403 });
  }

  const dn =
    typeof body?.displayName === "string" ? body.displayName.trim() : target.displayName;
  const pos = typeof body?.position === "string" ? body.position.trim() : target.position;
  const u = typeof body?.username === "string" ? body.username.trim() : target.username;
  if (!dn || !pos || !u) {
    return NextResponse.json(
      { ok: false, message: "Nombre, posición y usuario son obligatorios." },
      { status: 400 },
    );
  }
  if (await isAdminUsernameTaken(u, target.id)) {
    return NextResponse.json(
      { ok: false, message: "Ese nombre de usuario ya está en uso." },
      { status: 400 },
    );
  }
  const pwd = typeof body?.password === "string" ? body.password : "";
  if (pwd && pwd.length < 6) {
    return NextResponse.json(
      { ok: false, message: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 },
    );
  }
  const next: AdminOperator = {
    ...target,
    displayName: dn,
    position: pos,
    username: u,
    passwordHash: pwd ? hashPassword(pwd) : target.passwordHash,
  };
  await upsertDbAdminUser(next);
  return NextResponse.json({ ok: true, operator: toPublic(next) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await guardAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { id: rawId } = await params;
  const targetId = decodeURIComponent(rawId);
  const target = await getDbAdminUserByOperatorId(targetId);
  if (!target) {
    return NextResponse.json({ ok: false, message: "Perfil no encontrado." }, { status: 404 });
  }

  if (target.role === "it_master") {
    if (gate.role !== "it_master" || gate.id !== target.id) {
      return NextResponse.json(
        { ok: false, message: "Solo el perfil IT maestro puede eliminarse a sí mismo." },
        { status: 403 },
      );
    }
    const ok = await deleteDbAdminUserByOperatorId(targetId);
    if (!ok) {
      return NextResponse.json({ ok: false, message: "No se pudo eliminar." }, { status: 500 });
    }
    await clearAdminSession();
    return NextResponse.json({ ok: true, clearedSession: true });
  }

  if (gate.role !== "administrator" && gate.role !== "it_master") {
    return NextResponse.json({ ok: false, message: "Sin permiso." }, { status: 403 });
  }

  const ok = await deleteDbAdminUserByOperatorId(targetId);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "No se pudo eliminar." }, { status: 500 });
  }
  if (gate.id === target.id) {
    await clearAdminSession();
    return NextResponse.json({ ok: true, clearedSession: true });
  }
  return NextResponse.json({ ok: true });
}
