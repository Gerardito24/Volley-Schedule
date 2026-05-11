import type { MatchSideRef, SchedulePhaseMock } from "@/lib/schedule-types";
import { generateBracketFromAdvancers } from "@/lib/schedule-templates/generate-bracket-from-advancers";

function seedRef(seedNum: number): MatchSideRef {
  return { type: "seed", seedIndex: seedNum };
}

/** Construye bracket de eliminación simple con BYE estándar para equipos faltantes. */
export function generateSingleEliminationPhase(input: {
  phaseId: string;
  teamCount: number;
}): SchedulePhaseMock {
  const { phaseId, teamCount } = input;
  if (!Number.isInteger(teamCount) || teamCount < 2) {
    throw new Error("single_elim requiere al menos 2 equipos");
  }

  const advancers: MatchSideRef[] = Array.from({ length: teamCount }, (_, i) =>
    seedRef(i + 1),
  );

  return generateBracketFromAdvancers({
    phaseId,
    kind: "single_elim",
    templateId: "single_elim",
    config: { teamCount },
    advancers,
  });
}
