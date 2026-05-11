import type { MatchSideRef, ScheduleMatchMock, SchedulePhaseMock } from "@/lib/schedule-types";
import { bracketSeedLines, nextPowerOfTwo } from "@/lib/schedule-templates/bracket-seeding";

/** Primera ronda del bracket a partir de cabezas de serie ordenadas (índice 0 = mejor cabeza). */
export function generateBracketFromAdvancers(input: {
  phaseId: string;
  kind?: SchedulePhaseMock["kind"];
  templateId: string;
  config: Record<string, unknown>;
  advancers: MatchSideRef[];
}): SchedulePhaseMock {
  const {
    phaseId,
    advancers,
    kind = "single_elim",
    templateId,
    config,
  } = input;
  const n = advancers.length;
  if (!Number.isInteger(n) || n < 2) {
    throw new Error("Se necesitan al menos 2 posiciones en bracket");
  }

  const bracketSize = nextPowerOfTwo(n);
  const lines = bracketSeedLines(bracketSize);
  const matches: ScheduleMatchMock[] = [];

  const slotSide = (seedNumAtSlot: number): MatchSideRef => {
    if (seedNumAtSlot <= n) return advancers[seedNumAtSlot - 1]!;
    return { type: "bye" };
  };

  let prevRoundIds: string[] = [];
  const roundsTotal = Math.log2(bracketSize);

  for (let r = 0; r < roundsTotal; r++) {
    const matchCount = bracketSize >> (r + 1);
    const roundIds: string[] = [];

    for (let m = 0; m < matchCount; m++) {
      const id = `${phaseId}-r${r}-m${m}`;
      let home: MatchSideRef;
      let away: MatchSideRef;

      if (r === 0) {
        const si = m * 2;
        home = slotSide(lines[si]!);
        away = slotSide(lines[si + 1]!);
      } else {
        const leftPrev = prevRoundIds[m * 2];
        const rightPrev = prevRoundIds[m * 2 + 1];
        if (!leftPrev || !rightPrev) {
          throw new Error("bracket incompleto");
        }
        home = { type: "winner", matchId: leftPrev };
        away = { type: "winner", matchId: rightPrev };
      }

      matches.push({
        id,
        phaseId,
        round: r,
        orderInRound: m,
        home,
        away,
      });
      roundIds.push(id);
    }

    prevRoundIds = roundIds;
  }

  return {
    id: phaseId,
    kind,
    templateId,
    config,
    pools: [],
    matches,
  };
}
