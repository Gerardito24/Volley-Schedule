import type { TournamentMock } from "@/lib/mock-data";

/** Demo tournaments first; locally stored entries only add slugs not already in the seed list. */
export function mergeAdminTournaments(
  seed: TournamentMock[],
  stored: TournamentMock[],
): TournamentMock[] {
  const seedSlugs = new Set(seed.map((t) => t.slug));
  const extra = stored.filter((t) => !seedSlugs.has(t.slug));
  return [...seed, ...extra];
}
