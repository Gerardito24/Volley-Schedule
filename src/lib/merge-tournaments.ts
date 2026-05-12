import type { TournamentMock } from "@/lib/mock-data";
import { normalizeTournament } from "@/lib/mock-data";

/**
 * Lista para admin: torneos seed sustituidos por copia local si existe el mismo slug,
 * más entradas solo en localStorage.
 */
export function mergeAdminTournaments(
  seed: TournamentMock[],
  stored: TournamentMock[],
): TournamentMock[] {
  const storedBySlug = new Map(stored.map((t) => [t.slug, t]));
  const seedSlugs = new Set(seed.map((t) => t.slug));
  const out: TournamentMock[] = [];
  for (const t of seed) {
    out.push(normalizeTournament(storedBySlug.get(t.slug) ?? t));
  }
  for (const t of stored) {
    if (!seedSlugs.has(t.slug)) out.push(normalizeTournament(t));
  }
  return out;
}
