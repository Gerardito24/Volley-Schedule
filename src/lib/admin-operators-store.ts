import bcrypt from "bcryptjs";
import type { AdminOperator, AdminOperatorPublic, AdminSession } from "@/lib/admin-operator-types";
import {
  IT_MASTER_DISPLAY_NAME,
  IT_MASTER_POSITION,
  IT_MASTER_PROFILE_ID,
  LOCAL_ADMIN_OPERATORS_KEY,
  SESSION_ADMIN_KEY,
} from "@/lib/admin-operator-types";

const BCRYPT_ROUNDS = 10;

const STORAGE_WRITE_ERROR =
  "No se pudo guardar en este navegador. Libera espacio, desactiva modo privado o usa siempre la misma URL del sitio.";

let sessionMigrated = false;

function migrateSessionFromLegacyStorage(): void {
  if (typeof window === "undefined" || sessionMigrated) return;
  sessionMigrated = true;
  try {
    const legacy = window.sessionStorage.getItem(SESSION_ADMIN_KEY);
    if (!legacy) return;
    if (!window.localStorage.getItem(SESSION_ADMIN_KEY)) {
      window.localStorage.setItem(SESSION_ADMIN_KEY, legacy);
    }
    window.sessionStorage.removeItem(SESSION_ADMIN_KEY);
  } catch {
    // ignore migration errors
  }
}

function notifyOperatorsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("volleyschedule-admin-operators-changed"));
}

function notifySessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("volleyschedule-admin-session-changed"));
}

function isOperator(v: unknown): v is AdminOperator {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.displayName !== "string" ||
    typeof o.position !== "string" ||
    typeof o.username !== "string" ||
    typeof o.passwordHash !== "string" ||
    (o.role !== "it_master" && o.role !== "administrator") ||
    typeof o.createdAt !== "string"
  ) {
    return false;
  }
  if (o.organizerEmail !== undefined && typeof o.organizerEmail !== "string") return false;
  return true;
}

export function readOperators(): AdminOperator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ADMIN_OPERATORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOperator);
  } catch {
    return [];
  }
}

function persistOperators(list: AdminOperator[]): StoreResult {
  if (typeof window === "undefined") return { ok: false, message: "Solo disponible en el navegador." };
  try {
    window.localStorage.setItem(LOCAL_ADMIN_OPERATORS_KEY, JSON.stringify(list));
    notifyOperatorsChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: STORAGE_WRITE_ERROR };
  }
}

export function toPublic(op: AdminOperator): AdminOperatorPublic {
  const { passwordHash: _, ...rest } = op;
  return rest;
}

export function listOperatorsPublic(): AdminOperatorPublic[] {
  return readOperators().map(toPublic);
}

export function hasItMasterProfile(): boolean {
  return readOperators().some((o) => o.role === "it_master");
}

export function getItMaster(): AdminOperator | null {
  return readOperators().find((o) => o.role === "it_master") ?? null;
}

export function getOperatorById(id: string): AdminOperator | null {
  return readOperators().find((o) => o.id === id) ?? null;
}

export function getOperatorByUsername(username: string): AdminOperator | null {
  const u = username.trim().toLowerCase();
  return readOperators().find((o) => o.username.trim().toLowerCase() === u) ?? null;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export type StoreError = { ok: false; message: string };
export type StoreOk<T = void> = { ok: true; value?: T };
export type StoreResult<T = void> = StoreOk<T> | StoreError;

function uniqueUsername(username: string, excludeId?: string): boolean {
  const u = username.trim().toLowerCase();
  return !readOperators().some(
    (o) => o.id !== excludeId && o.username.trim().toLowerCase() === u,
  );
}

const organizerEmailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** First-run: create the single IT master (fixed name/position). */
export function createItMaster(
  username: string,
  password: string,
  organizerEmail?: string,
): StoreResult<AdminOperator> {
  if (typeof window === "undefined") return { ok: false, message: "Solo disponible en el navegador." };
  if (hasItMasterProfile()) return { ok: false, message: "El perfil IT maestro ya existe." };
  const u = username.trim();
  if (!u) return { ok: false, message: "Usuario requerido." };
  if (password.length < 6) return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  if (!uniqueUsername(u)) return { ok: false, message: "Ese nombre de usuario ya está en uso." };

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
  const saved = persistOperators([op]);
  if (!saved.ok) return saved;
  return { ok: true, value: op };
}

export function tryLogin(username: string, password: string): AdminOperator | null {
  const op = getOperatorByUsername(username);
  if (!op) return null;
  if (!verifyPassword(password, op.passwordHash)) return null;
  return op;
}

export function readSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  migrateSessionFromLegacyStorage();
  try {
    const raw = window.localStorage.getItem(SESSION_ADMIN_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const id = (o as { profileId?: string }).profileId;
    if (typeof id !== "string" || !id) return null;
    const op = getOperatorById(id);
    if (!op) {
      window.localStorage.removeItem(SESSION_ADMIN_KEY);
      return null;
    }
    return { profileId: id };
  } catch {
    return null;
  }
}

export function setSession(profileId: string): void {
  if (typeof window === "undefined") return;
  migrateSessionFromLegacyStorage();
  window.localStorage.setItem(SESSION_ADMIN_KEY, JSON.stringify({ profileId }));
  window.sessionStorage.removeItem(SESSION_ADMIN_KEY);
  notifySessionChanged();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_ADMIN_KEY);
  window.sessionStorage.removeItem(SESSION_ADMIN_KEY);
  notifySessionChanged();
}

export function getCurrentOperator(): AdminOperator | null {
  const s = readSession();
  if (!s) return null;
  return getOperatorById(s.profileId);
}

/** IT master or administrator may create additional administrators. */
export function addAdministrator(
  actor: AdminOperator,
  displayName: string,
  position: string,
  username: string,
  password: string,
): StoreResult<AdminOperator> {
  if (actor.role !== "it_master" && actor.role !== "administrator") {
    return { ok: false, message: "Sin permiso." };
  }
  const dn = displayName.trim();
  const pos = position.trim();
  const u = username.trim();
  if (!dn || !pos || !u) return { ok: false, message: "Nombre, posición y usuario son obligatorios." };
  if (password.length < 6) return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  if (!uniqueUsername(u)) return { ok: false, message: "Ese nombre de usuario ya está en uso." };

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `adm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const op: AdminOperator = {
    id,
    displayName: dn,
    position: pos,
    username: u,
    passwordHash: hashPassword(password),
    role: "administrator",
    createdAt: new Date().toISOString(),
  };
  const saved = persistOperators([...readOperators(), op]);
  if (!saved.ok) return saved;
  return { ok: true, value: op };
}

export function deleteOperator(actor: AdminOperator, targetId: string): StoreResult {
  const list = readOperators();
  const target = list.find((o) => o.id === targetId);
  if (!target) return { ok: false, message: "Perfil no encontrado." };

  if (target.role === "it_master") {
    if (actor.role !== "it_master" || actor.id !== target.id) {
      return { ok: false, message: "Solo el perfil IT maestro puede eliminarse a sí mismo." };
    }
    const saved = persistOperators(list.filter((o) => o.id !== targetId));
    if (!saved.ok) return saved;
    clearSession();
    return { ok: true };
  }

  if (actor.role === "administrator" || actor.role === "it_master") {
    const saved = persistOperators(list.filter((o) => o.id !== targetId));
    if (!saved.ok) return saved;
    if (readSession()?.profileId === targetId) clearSession();
    return { ok: true };
  }

  return { ok: false, message: "Sin permiso." };
}

export type UpdateOperatorPatch = {
  displayName?: string;
  position?: string;
  username?: string;
  password?: string;
  /** Solo IT maestro; vacío borra el valor guardado. */
  organizerEmail?: string;
};

export function updateOperator(
  actor: AdminOperator,
  targetId: string,
  patch: UpdateOperatorPatch,
): StoreResult {
  const list = readOperators();
  const idx = list.findIndex((o) => o.id === targetId);
  if (idx < 0) return { ok: false, message: "Perfil no encontrado." };
  const target = list[idx]!;

  if (target.role === "it_master") {
    if (actor.id !== target.id || actor.role !== "it_master") {
      return { ok: false, message: "Solo el IT maestro puede editar su propio perfil." };
    }
    const nextUsername = patch.username?.trim() ?? target.username;
    if (!nextUsername) return { ok: false, message: "Usuario requerido." };
    if (!uniqueUsername(nextUsername, target.id)) {
      return { ok: false, message: "Ese nombre de usuario ya está en uso." };
    }
    let organizerEmail = target.organizerEmail;
    if (patch.organizerEmail !== undefined) {
      const t = patch.organizerEmail.trim();
      if (t && !organizerEmailRe.test(t)) {
        return { ok: false, message: "Correo del organizador no válido." };
      }
      organizerEmail = t || undefined;
    }
    const next: AdminOperator = {
      ...target,
      username: nextUsername,
      passwordHash: patch.password ? hashPassword(patch.password) : target.passwordHash,
    };
    if (organizerEmail) {
      next.organizerEmail = organizerEmail;
    } else {
      delete next.organizerEmail;
    }
    const nextList = [...list];
    nextList[idx] = next;
    const saved = persistOperators(nextList);
    if (!saved.ok) return saved;
    return { ok: true };
  }

  if (actor.role !== "it_master" && actor.role !== "administrator") {
    return { ok: false, message: "Sin permiso." };
  }

  const dn = patch.displayName?.trim() ?? target.displayName;
  const pos = patch.position?.trim() ?? target.position;
  const u = patch.username?.trim() ?? target.username;
  if (!dn || !pos || !u) return { ok: false, message: "Nombre, posición y usuario son obligatorios." };
  if (!uniqueUsername(u, target.id)) return { ok: false, message: "Ese nombre de usuario ya está en uso." };

  const next: AdminOperator = {
    ...target,
    displayName: dn,
    position: pos,
    username: u,
    passwordHash: patch.password ? hashPassword(patch.password) : target.passwordHash,
  };
  const nextList = [...list];
  nextList[idx] = next;
  const saved = persistOperators(nextList);
  if (!saved.ok) return saved;
  return { ok: true };
}
