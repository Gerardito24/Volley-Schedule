import type { CategoryMock, TournamentMock } from "@/lib/mock-data";

/** Tarifa de inscripción aplicable a la categoría (override o base del torneo). */
export function effectiveCategoryFeeCents(
  category: CategoryMock,
  tournament: TournamentMock,
): number | null {
  if (category.feeCents != null) return category.feeCents;
  return tournament.registrationFeeCents;
}

/** Menor tarifa efectiva entre categorías; null si ninguna resuelve. */
export function minEffectiveFeeCents(tournament: TournamentMock): number | null {
  const fees = tournament.categories
    .map((cat) => effectiveCategoryFeeCents(cat, tournament))
    .filter((f): f is number => f != null);
  if (fees.length === 0) return null;
  return Math.min(...fees);
}
