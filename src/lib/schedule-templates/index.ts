export { bracketSeedLines, nextPowerOfTwo } from "@/lib/schedule-templates/bracket-seeding";
export { generateBracketFromAdvancers } from "@/lib/schedule-templates/generate-bracket-from-advancers";
export { generateSingleEliminationPhase } from "@/lib/schedule-templates/generate-single-elim";
export {
  assignSeedsToPoolsRoundRobin,
  generatePoolsRoundRobinPhase,
  generatePoolsToBracketPhases,
} from "@/lib/schedule-templates/generate-pools-bracket";

export const SCHEDULE_TEMPLATE_OPTIONS = [
  {
    id: "single_elim" as const,
    label: "Eliminación simple (bracket)",
    description: "Todos entran al bracket con BYE si no es potencia de 2.",
  },
  {
    id: "pools_to_bracket" as const,
    label: "Pools (round robin) + bracket",
    description:
      "Equipos repartidos en pools; cada pool juega todos contra todos; clasifican los primeros N de cada pool.",
  },
];
