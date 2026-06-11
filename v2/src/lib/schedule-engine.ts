import type {
  CategorySchedule,
  CategoryScheduleSettings,
  Match,
  MatchSide,
  Pool,
  ScheduleTeam,
} from "./types";

let idCounter = 0;
function matchId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function roundLabel(roundsFromFinal: number): string {
  switch (roundsFromFinal) {
    case 0:
      return "Final";
    case 1:
      return "Semifinal";
    case 2:
      return "Cuartos";
    case 3:
      return "Octavos";
    default:
      return `Ronda ${roundsFromFinal + 1}`;
  }
}

/** Posiciones clásicas de siembra para un bracket de tamaño potencia de 2 */
function bracketSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    const next: number[] = [];
    for (const x of order) {
      next.push(x, sum - x);
    }
    order = next;
  }
  return order;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Eliminación sencilla a partir de las primeras posiciones del bracket.
 * `firstRoundSides` define cada lado inicial (seed, pool rank o bye).
 */
function buildEliminationFromSides(
  firstRoundSides: MatchSide[],
  startOrder: number,
): Match[] {
  const totalRounds = Math.log2(firstRoundSides.length);
  const matches: Match[] = [];
  let order = startOrder;

  let currentRound: Match[] = [];
  for (let i = 0; i < firstRoundSides.length; i += 2) {
    const m: Match = {
      id: matchId("m"),
      phaseLabel: roundLabel(totalRounds - 1),
      order: order++,
      round: 1,
      home: firstRoundSides[i],
      away: firstRoundSides[i + 1],
      result: null,
    };
    currentRound.push(m);
  }
  matches.push(...currentRound);

  for (let round = 2; round <= totalRounds; round++) {
    const nextRound: Match[] = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      const m: Match = {
        id: matchId("m"),
        phaseLabel: roundLabel(totalRounds - round),
        order: order++,
        round,
        home: { type: "winner", matchId: currentRound[i].id },
        away: { type: "winner", matchId: currentRound[i + 1].id },
        result: null,
      };
      nextRound.push(m);
    }
    matches.push(...nextRound);
    currentRound = nextRound;
  }
  return matches;
}

export function generateSingleElim(teamCount: number): { pools: Pool[]; matches: Match[] } {
  const size = nextPowerOfTwo(Math.max(teamCount, 2));
  const positions = bracketSeedOrder(size);
  const sides: MatchSide[] = positions.map((pos) =>
    pos <= teamCount ? { type: "seed", seed: pos - 1 } : { type: "bye" },
  );
  return { pools: [], matches: buildEliminationFromSides(sides, 1) };
}

/** Round robin con método del círculo. Devuelve rondas de pares [a, b]. */
function roundRobinPairs(items: number[]): [number, number][][] {
  const list = [...items];
  if (list.length % 2 === 1) list.push(-1); // descanso
  const n = list.length;
  const rounds: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== -1 && b !== -1) round.push([a, b]);
    }
    rounds.push(round);
    list.splice(1, 0, list.pop() as number);
  }
  return rounds;
}

export function generatePoolsBracket(
  teamCount: number,
  poolCount: number,
  advancePerPool: number,
): { pools: Pool[]; matches: Match[] } {
  const pools: Pool[] = Array.from({ length: poolCount }, (_, i) => ({
    id: `pool-${String.fromCharCode(97 + i)}`,
    label: `Pool ${String.fromCharCode(65 + i)}`,
    teamSeeds: [],
  }));

  // Distribución serpiente de seeds
  for (let seed = 0; seed < teamCount; seed++) {
    const lap = Math.floor(seed / poolCount);
    const idx = seed % poolCount;
    const poolIdx = lap % 2 === 0 ? idx : poolCount - 1 - idx;
    pools[poolIdx].teamSeeds.push(seed);
  }

  const matches: Match[] = [];
  let order = 1;
  // Intercalar rondas de pools para que se jueguen en paralelo
  const poolRounds = pools.map((p) => roundRobinPairs(p.teamSeeds));
  const maxRounds = Math.max(...poolRounds.map((r) => r.length));
  for (let r = 0; r < maxRounds; r++) {
    pools.forEach((pool, pi) => {
      const round = poolRounds[pi][r];
      if (!round) return;
      for (const [a, b] of round) {
        matches.push({
          id: matchId("p"),
          phaseLabel: pool.label,
          order: order++,
          round: r + 1,
          poolId: pool.id,
          home: { type: "seed", seed: a },
          away: { type: "seed", seed: b },
          result: null,
        });
      }
    });
  }

  // Bracket de clasificados: 1ros de cada pool, luego 2dos, etc.
  const qualifiers: MatchSide[] = [];
  for (let rank = 1; rank <= advancePerPool; rank++) {
    for (const pool of pools) {
      qualifiers.push({ type: "pool", poolId: pool.id, rank });
    }
  }
  const size = nextPowerOfTwo(Math.max(qualifiers.length, 2));
  const positions = bracketSeedOrder(size);
  const sides: MatchSide[] = positions.map((pos) =>
    pos <= qualifiers.length ? qualifiers[pos - 1] : { type: "bye" },
  );
  const bracketMatches = buildEliminationFromSides(sides, order);
  // El bracket arranca después de los pools
  const poolRoundOffset = maxRounds;
  for (const m of bracketMatches) {
    m.round += poolRoundOffset;
  }
  matches.push(...bracketMatches);

  return { pools, matches };
}

/** Asigna horarios y canchas: rondas en bloques, canchas en ciclo. */
export function autoAssignSchedule(
  matches: Match[],
  settings: CategoryScheduleSettings,
): Match[] {
  const courts = settings.courts.length > 0 ? settings.courts : ["Cancha 1"];
  const start = new Date(settings.startAt).getTime();
  const slotMs = settings.durationMinutes * 60_000;

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  let slot = 0;
  const assigned = matches.map((m) => ({ ...m }));
  for (const round of rounds) {
    const roundMatches = assigned
      .filter((m) => m.round === round && !isByeMatch(m))
      .sort((a, b) => a.order - b.order);
    roundMatches.forEach((m, i) => {
      const slotInRound = Math.floor(i / courts.length);
      m.court = courts[i % courts.length];
      m.startsAt = new Date(start + (slot + slotInRound) * slotMs).toISOString();
    });
    slot += Math.max(1, Math.ceil(roundMatches.length / courts.length));
  }
  return assigned;
}

export function isByeMatch(match: Match): boolean {
  return match.home.type === "bye" || match.away.type === "bye";
}

// ---------------------------------------------------------------------------
// Resolución de lados (nombres de equipos, ganadores, standings de pool)
// ---------------------------------------------------------------------------

export interface ResolvedSide {
  label: string;
  seed: number | null;
  decided: boolean;
}

interface PoolStanding {
  seed: number;
  wins: number;
  losses: number;
  pointDiff: number;
}

export function computePoolStandings(
  cs: CategorySchedule,
  poolId: string,
): { standings: PoolStanding[]; complete: boolean } {
  const pool = cs.pools.find((p) => p.id === poolId);
  if (!pool) return { standings: [], complete: false };
  const stats = new Map<number, PoolStanding>(
    pool.teamSeeds.map((seed) => [seed, { seed, wins: 0, losses: 0, pointDiff: 0 }]),
  );
  const poolMatches = cs.matches.filter((m) => m.poolId === poolId);
  let complete = poolMatches.length > 0;
  for (const m of poolMatches) {
    if (!m.result) {
      complete = false;
      continue;
    }
    const homeSeed = m.home.type === "seed" ? m.home.seed : null;
    const awaySeed = m.away.type === "seed" ? m.away.seed : null;
    if (homeSeed == null || awaySeed == null) continue;
    const home = stats.get(homeSeed);
    const away = stats.get(awaySeed);
    if (!home || !away) continue;
    home.pointDiff += m.result.home - m.result.away;
    away.pointDiff += m.result.away - m.result.home;
    if (m.result.home > m.result.away) {
      home.wins += 1;
      away.losses += 1;
    } else {
      away.wins += 1;
      home.losses += 1;
    }
  }
  const standings = [...stats.values()].sort(
    (a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff || a.seed - b.seed,
  );
  return { standings, complete };
}

function teamLabel(cs: CategorySchedule, seed: number): string {
  return cs.teams.find((t) => t.seed === seed)?.label ?? `Equipo ${seed + 1}`;
}

/** Ganador efectivo de un partido (auto-gana contra bye). Devuelve seed o null. */
export function matchWinnerSeed(cs: CategorySchedule, match: Match): number | null {
  const homeRes = resolveSide(cs, match.home);
  const awayRes = resolveSide(cs, match.away);
  if (match.home.type === "bye") return awayRes.seed;
  if (match.away.type === "bye") return homeRes.seed;
  if (!match.result) return null;
  if (!homeRes.decided || !awayRes.decided) return null;
  return match.result.home > match.result.away ? homeRes.seed : awayRes.seed;
}

export function matchLoserSeed(cs: CategorySchedule, match: Match): number | null {
  const winner = matchWinnerSeed(cs, match);
  if (winner == null) return null;
  const homeRes = resolveSide(cs, match.home);
  const awayRes = resolveSide(cs, match.away);
  return winner === homeRes.seed ? awayRes.seed : homeRes.seed;
}

export function resolveSide(cs: CategorySchedule, side: MatchSide): ResolvedSide {
  switch (side.type) {
    case "seed":
      return { label: teamLabel(cs, side.seed), seed: side.seed, decided: true };
    case "bye":
      return { label: "BYE", seed: null, decided: true };
    case "pool": {
      const pool = cs.pools.find((p) => p.id === side.poolId);
      const { standings, complete } = computePoolStandings(cs, side.poolId);
      if (complete && standings[side.rank - 1]) {
        const seed = standings[side.rank - 1].seed;
        return { label: teamLabel(cs, seed), seed, decided: true };
      }
      const ordinal = side.rank === 1 ? "1ro" : side.rank === 2 ? "2do" : `${side.rank}to`;
      return { label: `${ordinal} ${pool?.label ?? "Pool"}`, seed: null, decided: false };
    }
    case "winner": {
      const match = cs.matches.find((m) => m.id === side.matchId);
      if (!match) return { label: "Por definir", seed: null, decided: false };
      const seed = matchWinnerSeed(cs, match);
      if (seed != null) return { label: teamLabel(cs, seed), seed, decided: true };
      return { label: `Ganador ${shortMatchLabel(match)}`, seed: null, decided: false };
    }
    case "loser": {
      const match = cs.matches.find((m) => m.id === side.matchId);
      if (!match) return { label: "Por definir", seed: null, decided: false };
      const seed = matchLoserSeed(cs, match);
      if (seed != null) return { label: teamLabel(cs, seed), seed, decided: true };
      return { label: `Perdedor ${shortMatchLabel(match)}`, seed: null, decided: false };
    }
  }
}

function shortMatchLabel(match: Match): string {
  return `${match.phaseLabel} #${match.order}`;
}

/** Campeón de la categoría si la final tiene resultado */
export function categoryChampion(cs: CategorySchedule): string | null {
  const final = cs.matches.find((m) => m.phaseLabel === "Final");
  if (!final) return null;
  const seed = matchWinnerSeed(cs, final);
  return seed != null ? teamLabel(cs, seed) : null;
}

export function playableMatches(cs: CategorySchedule): Match[] {
  return cs.matches.filter((m) => !isByeMatch(m)).sort((a, b) => a.order - b.order);
}
