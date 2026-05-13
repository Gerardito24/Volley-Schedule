import type { RegistrationRowMock } from "@/lib/mock-data";
import { upsertRemoteRegistration } from "@/lib/remote-registrations";

export const LOCAL_REGISTRATIONS_KEY = "volleyschedule-registrations-v1";

function notifyRegistrationsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("volleyschedule-registrations-changed"));
}

export function readStoredRegistrations(): RegistrationRowMock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_REGISTRATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed.filter(isRegistrationRowMock) as RegistrationRowMock[]).map(
      (r) => ({
        ...r,
        // Backwards-compat: rows saved before clubName was added
        clubName: r.clubName || r.teamName,
      }),
    );
  } catch {
    return [];
  }
}

export function writeStoredRegistrations(rows: RegistrationRowMock[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(rows));
}

export function appendStoredRegistration(row: RegistrationRowMock): void {
  const existing = readStoredRegistrations();
  writeStoredRegistrations([...existing, row]);
  void upsertRemoteRegistration(row).catch(() => {
    // Railway/Postgres is optional during migration; localStorage remains fallback.
  });
  notifyRegistrationsChanged();
}

/** Reemplaza una fila por `id` o la agrega si no existía (solo almacenadas). */
export function upsertStoredRegistration(row: RegistrationRowMock): void {
  const existing = readStoredRegistrations();
  const idx = existing.findIndex((r) => r.id === row.id);
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = row;
    writeStoredRegistrations(next);
  } else {
    writeStoredRegistrations([...existing, row]);
  }
  void upsertRemoteRegistration(row).catch(() => {
    // Railway/Postgres is optional during migration; localStorage remains fallback.
  });
  notifyRegistrationsChanged();
}

function isRegistrationRowMock(value: unknown): value is RegistrationRowMock {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const statusOk =
    o.status === "draft" ||
    o.status === "pending_payment" ||
    o.status === "paid" ||
    o.status === "under_review" ||
    o.status === "approved" ||
    o.status === "rejected" ||
    o.status === "waitlisted";
  const subOk =
    o.subdivisionId === undefined ||
    o.subdivisionId === null ||
    typeof o.subdivisionId === "string";
  return (
    typeof o.id === "string" &&
    typeof o.tournamentSlug === "string" &&
    typeof o.tournamentName === "string" &&
    typeof o.divisionLabel === "string" &&
    typeof o.teamName === "string" &&
    // clubName: optional for backwards-compat; fallback applied on read
    (o.clubName === undefined || typeof o.clubName === "string") &&
    statusOk &&
    typeof o.updatedAt === "string" &&
    typeof o.feeCents === "number" &&
    typeof o.registeredAt === "string" &&
    typeof o.categoryId === "string" &&
    subOk
  );
}
