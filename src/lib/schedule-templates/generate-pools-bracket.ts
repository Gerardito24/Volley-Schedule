import type { MatchSideRef, SchedulePhaseMock, SchedulePoolMock } from "@/lib/schedule-types";
import { generateBracketFromAdvancers } from "@/lib/schedule-templates/generate-bracket-from-advancers";

/** Reparto circular de seeds 1..N entre pools (balancea tamaños). */
export function assignSeedsToPoolsRoundRobin(
  teamCount: number,
  poolCount: number,
): SchedulePoolMock[] {
  if (!Number.isInteger(teamCount) || teamCount < 2) {
    throw new Error("Se necesitan al menos 2 equipos");
  }
  if (!Number.isInteger(poolCount) || poolCount < 2) {
    throw new Error("Se necesitan al menos 2 pools");
  }
  if (teamCount < poolCount) {
    throw new Error("No puede haber más pools que equipos");
  }

  const pools: SchedulePoolMock[] = Array.from({ length: poolCount }, (_, i) => ({
    id: `pool-${i + 1}`,
    label: `Pool ${String.fromCharCode(65 + i)}`,
    seedIndices: [] as number[],
  }));

  for (let s = 1; s <= teamCount; s++) {
    const idx = (s - 1) % poolCount;
    pools[idx]!.seedIndices.push(s);
  }

  return pools;
}

function roundRobinPairs(seedIndices: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < seedIndices.length; i++) {
    for (let j = i + 1; j < seedIndices.length; j++) {
      pairs.push([seedIndices[i]!, seedIndices[j]!]);
    }
  }
  return pairs;
}

/** Fase todos contra todos dentro de cada pool (un solo round). */
export function generatePoolsRoundRobinPhase(input: {
  phaseId: string;
  pools: SchedulePoolMock[];
}): SchedulePhaseMock {
  const { phaseId, pools } = input;
  const matches: SchedulePhaseMock["matches"] = [];
  let orderInRound = 0;

  for (const pool of pools) {
    for (const [h, a] of roundRobinPairs(pool.seedIndices)) {
      matches.push({
        id: `${phaseId}-${pool.id}-m${orderInRound}`,
        phaseId,
        round: 0,
        orderInRound,
        home: { type: "seed", seedIndex: h },
        away: { type: "seed", seedIndex: a },
      });
      orderInRound += 1;
    }
  }

  return {
    id: phaseId,
    kind: "pool_play",
    templateId: "pools_round_robin",
    config: { poolCount: pools.length },
    pools,
    matches,
  };
}

/**
 * Pools (round robin) + bracket eliminatorio.
 * Los clasificados se ordenan: Pool A 1º, A 2º, B 1º, B 2º, … y entran al bracket con BYE si hace falta.
 */
export function generatePoolsToBracketPhases(input: {
  categoryKey: string;
  teamCount: number;
  poolCount: number;
  advancePerPool: number;
}): { poolsPhase: SchedulePhaseMock; bracketPhase: SchedulePhaseMock } {
  const { categoryKey, teamCount, poolCount, advancePerPool } = input;
  if (!Number.isInteger(advancePerPool) || advancePerPool < 1) {
    throw new Error("advancePerPool debe ser >= 1");
  }

  const pools = assignSeedsToPoolsRoundRobin(teamCount, poolCount);
  const rrId = `${categoryKey}-pool-rr`;
  const poolsPhase = generatePoolsRoundRobinPhase({
    phaseId: rrId,
    pools,
  });

  const advancers: MatchSideRef[] = [];
  for (const p of pools) {
    for (let place = 1; place <= advancePerPool; place++) {
      advancers.push({ type: "poolStanding", poolId: p.id, place });
    }
  }

  const bracketPhase = generateBracketFromAdvancers({
    phaseId: `${categoryKey}-pool-bracket`,
    kind: "single_elim",
    templateId: "pools_to_bracket",
    config: {
      teamCount,
      poolCount,
      advancePerPool,
    },
    advancers,
  });

  return { poolsPhase, bracketPhase };
}
