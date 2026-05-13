import type { TournamentVenue } from "@/lib/mock-data";
import type { ScheduleAssignmentMock } from "@/lib/schedule-types";

export type CourtRef = {
  /** Estable mientras el orden de sedes no cambie (ej. v0-c1). */
  id: string;
  /** Etiqueta humana (sede · cancha). */
  label: string;
  venueIndex: number;
  venueLabel: string;
  /** 1-based dentro de la sede. */
  courtNumber: number;
};

/**
 * Aplana sedes con `courtCount` entero mayor o igual a 1. Sedes sin número o inválidas se omiten.
 */
export function flattenTournamentCourts(venues: TournamentVenue[]): CourtRef[] {
  const out: CourtRef[] = [];
  venues.forEach((v, venueIndex) => {
    const n = v.courtCount;
    if (n == null || !Number.isInteger(n) || n < 1) return;
    const venueName = v.label.trim() || `Sede ${venueIndex + 1}`;
    for (let k = 1; k <= n; k++) {
      out.push({
        id: `v${venueIndex}-c${k}`,
        label: `${venueName} · Cancha ${k}`,
        venueIndex,
        venueLabel: venueName,
        courtNumber: k,
      });
    }
  });
  return out;
}

export function tournamentHasSchedulableCourts(venues: TournamentVenue[]): boolean {
  return flattenTournamentCourts(venues).length > 0;
}

export function courtRefsById(courts: CourtRef[]): Map<string, CourtRef> {
  return new Map(courts.map((c) => [c.id, c]));
}

/** Datos legacy: "Cancha N" → N-ésima cancha global (1-based). */
export function legacyCanchaNumberToCourtId(
  courts: CourtRef[],
  canchaNumber: number,
): string | null {
  if (!Number.isInteger(canchaNumber) || canchaNumber < 1) return null;
  if (canchaNumber > courts.length) return null;
  return courts[canchaNumber - 1]!.id;
}

/**
 * Resuelve a `courtId` global. Orden: `courtId` válido → etiqueta exacta → patrón Cancha N.
 */
export function resolveCourtIdFromAssignment(
  a: ScheduleAssignmentMock,
  courts: CourtRef[],
): string | null {
  if (courts.length === 0) return null;
  if (a.courtId) {
    if (courts.some((c) => c.id === a.courtId)) return a.courtId;
  }
  const label = (a.courtLabel ?? "").trim();
  if (label) {
    const exact = courts.find((c) => c.label === label);
    if (exact) return exact.id;
    const m = label.match(/^Cancha\s+(\d+)$/i);
    if (m) {
      const n = Number.parseInt(m[1]!, 10);
      return legacyCanchaNumberToCourtId(courts, n);
    }
  }
  return null;
}

export function courtLabelForId(courts: CourtRef[], courtId: string): string {
  return courts.find((c) => c.id === courtId)?.label ?? courtId;
}
