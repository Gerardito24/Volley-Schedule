import type { MatchSideRef } from "@/lib/schedule-types";

/** Etiqueta legible para UI / público (sin resolver resultados reales). */
export function formatMatchSide(
  side: MatchSideRef,
  teamLabels: string[],
  matchIndexById?: Map<string, number>,
): string {
  switch (side.type) {
    case "bye":
      return "BYE";
    case "seed": {
      const name = teamLabels[side.seedIndex - 1]?.trim();
      return name || `Seed ${side.seedIndex}`;
    }
    case "winner": {
      const idx = matchIndexById?.get(side.matchId);
      const suffix = idx != null ? ` (#${idx + 1})` : "";
      return `Ganador partido${suffix}`;
    }
    case "loser": {
      const idx = matchIndexById?.get(side.matchId);
      const suffix = idx != null ? ` (#${idx + 1})` : "";
      return `Perdedor partido${suffix}`;
    }
    case "poolStanding":
      return `${side.poolId} · ${side.place}º`;
    default:
      return "—";
  }
}

export function buildMatchOrderIndex(matches: { id: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  matches.forEach((x, i) => m.set(x.id, i));
  return m;
}
