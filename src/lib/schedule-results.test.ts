import { describe, expect, it } from "vitest";
import type { CategoryScheduleMock } from "@/lib/schedule-types";
import {
  applyMatchResult,
  canRecordMatchResult,
  resolveSideToTeamLabel,
} from "@/lib/schedule-results";

function sampleBracket(): CategoryScheduleMock {
  return {
    categoryId: "c1",
    teamLabels: ["A", "B", "C", "D"],
    phases: [
      {
        id: "p-br",
        kind: "single_elim",
        templateId: "single_elim",
        config: {},
        pools: [],
        matches: [
          {
            id: "m1",
            phaseId: "p-br",
            round: 0,
            orderInRound: 0,
            home: { type: "seed", seedIndex: 1 },
            away: { type: "seed", seedIndex: 2 },
          },
          {
            id: "m2",
            phaseId: "p-br",
            round: 0,
            orderInRound: 1,
            home: { type: "seed", seedIndex: 3 },
            away: { type: "seed", seedIndex: 4 },
          },
          {
            id: "m3",
            phaseId: "p-br",
            round: 1,
            orderInRound: 0,
            home: { type: "winner", matchId: "m1" },
            away: { type: "winner", matchId: "m2" },
          },
        ],
      },
    ],
    assignments: {},
  };
}

describe("schedule-results", () => {
  it("cannot record final before semis", () => {
    const cs = sampleBracket();
    expect(canRecordMatchResult(cs, "m3")).toBe(false);
    expect(canRecordMatchResult(cs, "m1")).toBe(true);
  });

  it("apply chain resolves winner labels", () => {
    let cs = sampleBracket();
    let r = applyMatchResult(cs, "m1", 2, 0);
    expect(r.ok).toBe(true);
    cs = r.next;
    r = applyMatchResult(cs, "m2", 0, 2);
    expect(r.ok).toBe(true);
    cs = r.next;
    expect(canRecordMatchResult(cs, "m3")).toBe(true);
    r = applyMatchResult(cs, "m3", 2, 1);
    expect(r.ok).toBe(true);
    cs = r.next;
    const m3 = cs.phases[0]!.matches.find((x) => x.id === "m3")!;
    expect(resolveSideToTeamLabel(m3.home, cs)).toBe("A");
    expect(resolveSideToTeamLabel(m3.away, cs)).toBe("D");
  });

  it("rejects tie and non-integer scores", () => {
    const cs = sampleBracket();
    expect(applyMatchResult(cs, "m1", 1, 1).ok).toBe(false);
    expect(applyMatchResult(cs, "m1", 1.5, 0).ok).toBe(false);
  });
});
