import type { CategoryMock, RegistrationRowMock, TournamentMock } from "@/lib/mock-data";
import { formatRegistrationDivisionLabel, normalizeTournament } from "@/lib/mock-data";

/** Compara etiquetas de división aunque usen `·`, `-` o espacios distintos. */
export function normalizeDivisionLabelCompare(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s*·\s*/g, "|")
    .replace(/\s*-\s*/g, "|")
    .replace(/\s+/g, "");
}

/** Clave estable edad + etiqueta de división + género (para alinear categorías seed vs localStorage). */
export function stableCategoryKey(tournament: TournamentMock, cat: CategoryMock): string {
  const nt = normalizeTournament(tournament);
  const div = nt.divisions.find((d) => d.id === cat.divisionId);
  const divLabel = (div?.label ?? "").trim().toLowerCase();
  return `${String(cat.ageLabel ?? "").trim().toLowerCase()}|${divLabel}|${cat.gender}`;
}

/**
 * Indica si una inscripción corresponde a la categoría seleccionada en el admin,
 * aunque `categoryId` en la fila sea el id seed (`tp-10`, …) y en el torneo mergeado
 * la misma categoría tenga otro id (p. ej. tras guardar en localStorage).
 */
export function registrationMatchesAdminCategory(
  row: RegistrationRowMock,
  tournament: TournamentMock,
  categoryId: string,
  seedTournament: TournamentMock | undefined,
): boolean {
  if (row.tournamentSlug !== tournament.slug) return false;
  if (row.categoryId === categoryId) return true;
  const selected = tournament.categories.find((c) => c.id === categoryId);
  if (!selected) return false;
  const nt = normalizeTournament(tournament);
  if (seedTournament) {
    const ns = normalizeTournament(seedTournament);
    const seedCat = ns.categories.find((c) => c.id === row.categoryId);
    if (seedCat && stableCategoryKey(nt, selected) === stableCategoryKey(ns, seedCat)) {
      return true;
    }
  }
  const expected = formatRegistrationDivisionLabel(
    nt,
    selected,
    row.subdivisionId ?? null,
  );
  return (
    normalizeDivisionLabelCompare(row.divisionLabel) ===
    normalizeDivisionLabelCompare(expected)
  );
}
