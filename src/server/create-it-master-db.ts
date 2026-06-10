import type { AdminOperator } from "@/lib/admin-operator-types";
import {
  IT_MASTER_DISPLAY_NAME,
  IT_MASTER_POSITION,
  IT_MASTER_PROFILE_ID,
} from "@/lib/admin-operator-types";
import { hashPassword } from "@/lib/admin-operators-store";
import { hasDbItMaster, isAdminUsernameTaken, upsertDbAdminUser } from "@/server/admin-users-repo";

const organizerEmailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateItMasterDbResult =
  | { ok: true; operator: AdminOperator }
  | { ok: false; message: string };

export async function createItMasterInDb(
  username: string,
  password: string,
  organizerEmail?: string,
): Promise<CreateItMasterDbResult> {
  if (await hasDbItMaster()) {
    return { ok: false, message: "El perfil IT maestro ya existe." };
  }

  const u = username.trim();
  if (!u) return { ok: false, message: "Usuario requerido." };
  if (password.length < 6) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (await isAdminUsernameTaken(u)) {
    return { ok: false, message: "Ese nombre de usuario ya está en uso." };
  }

  const org = organizerEmail?.trim() ?? "";
  if (org && !organizerEmailRe.test(org)) {
    return { ok: false, message: "Correo del organizador no válido." };
  }

  const op: AdminOperator = {
    id: IT_MASTER_PROFILE_ID,
    displayName: IT_MASTER_DISPLAY_NAME,
    position: IT_MASTER_POSITION,
    username: u,
    passwordHash: hashPassword(password),
    role: "it_master",
    createdAt: new Date().toISOString(),
    ...(org ? { organizerEmail: org } : {}),
  };

  try {
    await upsertDbAdminUser(op);
  } catch {
    return { ok: false, message: "No se pudo guardar el perfil IT maestro." };
  }

  return { ok: true, operator: op };
}
