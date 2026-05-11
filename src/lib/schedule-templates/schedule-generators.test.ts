import { describe, expect, it } from "vitest";
import { bracketSeedLines, nextPowerOfTwo } from "@/lib/schedule-templates/bracket-seeding";
import { generateSingleEliminationPhase } from "@/lib/schedule-templates/generate-single-elim";
import { generatePoolsToBracketPhases } from "@/lib/schedule-templates/generate-pools-bracket";

describe("bracketSeedLines", () => {
  it("genera 8 líneas con valores 1..8 sin repetir", () => {
    const lines = bracketSeedLines(8);
    expect(lines).toHaveLength(8);
    expect(new Set(lines).size).toBe(8);
    const sorted = [...lines].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("nextPowerOfTwo", () => {
  it("redondea hacia arriba", () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(8)).toBe(8);
  });
});

describe("generateSingleEliminationPhase", () => {
  it("2 equipos → 1 partido entre seed 1 y 2", () => {
    const ph = generateSingleEliminationPhase({
      phaseId: "t",
      teamCount: 2,
    });
    expect(ph.matches).toHaveLength(1);
    expect(ph.matches[0]!.home).toEqual({ type: "seed", seedIndex: 1 });
    expect(ph.matches[0]!.away).toEqual({ type: "seed", seedIndex: 2 });
  });

  it("8 equipos → 7 partidos totales", () => {
    const ph = generateSingleEliminationPhase({
      phaseId: "t",
      teamCount: 8,
    });
    expect(ph.matches).toHaveLength(7);
  });

  it("5 equipos usa BYE en primera ronda", () => {
    const ph = generateSingleEliminationPhase({
      phaseId: "t",
      teamCount: 5,
    });
    const r0 = ph.matches.filter((m) => m.round === 0);
    expect(r0.length).toBe(4);
    const byeSides = r0.flatMap((m) => [m.home, m.away]).filter((s) => s.type === "bye");
    expect(byeSides.length).toBeGreaterThan(0);
  });
});

describe("generatePoolsToBracketPhases", () => {
  it("produce fase RR y bracket", () => {
    const { poolsPhase, bracketPhase } = generatePoolsToBracketPhases({
      categoryKey: "cat1",
      teamCount: 8,
      poolCount: 2,
      advancePerPool: 2,
    });
    expect(poolsPhase.matches.length).toBeGreaterThan(0);
    expect(poolsPhase.pools).toHaveLength(2);
    expect(bracketPhase.matches.length).toBeGreaterThan(0);
    const hasPoolStanding = bracketPhase.matches.some(
      (m) =>
        m.home.type === "poolStanding" || m.away.type === "poolStanding",
    );
    expect(hasPoolStanding).toBe(true);
  });
});
