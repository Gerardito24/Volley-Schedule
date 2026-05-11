import type { RegistrationRowMock } from "@/lib/mock-data";

/**
 * Filas seed sustituidas por la copia en localStorage si comparten `id`;
 * después se añaden filas solo locales (id que no está en seed).
 */
export function mergeAdminRegistrations(
  seed: RegistrationRowMock[],
  stored: RegistrationRowMock[],
): RegistrationRowMock[] {
  const storedById = new Map(stored.map((r) => [r.id, r]));
  const seedIds = new Set(seed.map((r) => r.id));
  const out: RegistrationRowMock[] = [];
  for (const row of seed) {
    out.push(storedById.get(row.id) ?? row);
  }
  for (const row of stored) {
    if (!seedIds.has(row.id)) out.push(row);
  }
  return out;
}
