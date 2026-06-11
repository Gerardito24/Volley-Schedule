import { randomUUID } from "crypto";
import type { AdminUser } from "./types";
import {
  deleteAdmin,
  getAdmin,
  getAdminByUsername,
  saveAdmin,
} from "./store";
import { hashPassword } from "./seed";

// ---------------------------------------------------------------------------
// Reglas de negocio de los perfiles de administrador (operadores).
//
// Roles:
//   it_master      → perfil raíz. Solo él puede editarse o eliminarse a sí
//                    mismo; nadie más puede tocarlo. No es eliminable.
//   administrator  → perfiles normales. El IT maestro y cualquier
//                    administrador pueden crearlos, editarlos y eliminarlos.
// ---------------------------------------------------------------------------

export const MIN_ADMIN_PASSWORD = 6;

export type OperatorResult = { ok: true } | { ok: false; error: string };

/** Versión segura del perfil (sin el hash de la contraseña). */
export type AdminOperatorPublic = Omit<AdminUser, "passwordHash">;

export function toPublicOperator(admin: AdminUser): AdminOperatorPublic {
  return {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    position: admin.position,
    role: admin.role,
    createdAt: admin.createdAt,
  };
}

function canManageAdministrators(actor: AdminUser): boolean {
  return actor.role === "it_master" || actor.role === "administrator";
}

async function usernameTaken(username: string, excludeId?: string): Promise<boolean> {
  const existing = await getAdminByUsername(username);
  return Boolean(existing) && existing!.id !== excludeId;
}

export interface CreateAdministratorInput {
  displayName: string;
  position: string;
  username: string;
  password: string;
}

export async function createAdministrator(
  actor: AdminUser,
  input: CreateAdministratorInput,
): Promise<OperatorResult> {
  if (!canManageAdministrators(actor)) return { ok: false, error: "Sin permiso." };

  const displayName = input.displayName.trim();
  const position = input.position.trim();
  const username = input.username.trim();
  if (!displayName || !position || !username) {
    return { ok: false, error: "Nombre, posición y usuario son obligatorios." };
  }
  if (input.password.length < MIN_ADMIN_PASSWORD) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD} caracteres.`,
    };
  }
  if (await usernameTaken(username)) {
    return { ok: false, error: "Ese nombre de usuario ya está en uso." };
  }

  const admin: AdminUser = {
    id: randomUUID(),
    username,
    displayName,
    position,
    passwordHash: hashPassword(input.password),
    role: "administrator",
    createdAt: new Date().toISOString(),
  };
  await saveAdmin(admin);
  return { ok: true };
}

export interface UpdateAdministratorPatch {
  displayName?: string;
  position?: string;
  username?: string;
  /** Vacío o ausente = mantener la contraseña actual. */
  password?: string;
}

export async function updateAdministrator(
  actor: AdminUser,
  targetId: string,
  patch: UpdateAdministratorPatch,
): Promise<OperatorResult> {
  const target = await getAdmin(targetId);
  if (!target) return { ok: false, error: "Perfil no encontrado." };

  if (target.role === "it_master") {
    if (actor.id !== target.id) {
      return { ok: false, error: "Solo el IT maestro puede editar su propio perfil." };
    }
  } else if (!canManageAdministrators(actor)) {
    return { ok: false, error: "Sin permiso." };
  }

  const displayName = patch.displayName?.trim() ?? target.displayName;
  const position = patch.position?.trim() ?? target.position;
  const username = patch.username?.trim() ?? target.username;
  if (!displayName || !position || !username) {
    return { ok: false, error: "Nombre, posición y usuario son obligatorios." };
  }
  const wantsPassword = Boolean(patch.password && patch.password.length > 0);
  if (wantsPassword && patch.password!.length < MIN_ADMIN_PASSWORD) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD} caracteres.`,
    };
  }
  if (await usernameTaken(username, target.id)) {
    return { ok: false, error: "Ese nombre de usuario ya está en uso." };
  }

  const next: AdminUser = {
    ...target,
    displayName,
    position,
    username,
    passwordHash: wantsPassword ? hashPassword(patch.password!) : target.passwordHash,
  };
  await saveAdmin(next);
  return { ok: true };
}

export async function deleteAdministrator(
  actor: AdminUser,
  targetId: string,
): Promise<OperatorResult> {
  const target = await getAdmin(targetId);
  if (!target) return { ok: false, error: "Perfil no encontrado." };

  if (target.role === "it_master") {
    return { ok: false, error: "El perfil IT maestro no se puede eliminar." };
  }
  if (!canManageAdministrators(actor)) {
    return { ok: false, error: "Sin permiso." };
  }

  await deleteAdmin(targetId);
  return { ok: true };
}
