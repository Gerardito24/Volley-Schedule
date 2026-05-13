import type { ClubProfile } from "@/lib/club-profile-types";

/**
 * Perfiles seed sustituidos por la copia en localStorage si comparten `clubSlug`;
 * después se añaden perfiles solo locales (slug que no está en seed).
 */
export function mergeClubProfiles(
  seed: ClubProfile[],
  stored: ClubProfile[],
): ClubProfile[] {
  const storedBySlug = new Map(stored.map((p) => [p.clubSlug, p]));
  const seedSlugs = new Set(seed.map((p) => p.clubSlug));
  const out: ClubProfile[] = [];
  for (const p of seed) {
    out.push(storedBySlug.get(p.clubSlug) ?? p);
  }
  for (const p of stored) {
    if (!seedSlugs.has(p.clubSlug)) out.push(p);
  }
  return out;
}
