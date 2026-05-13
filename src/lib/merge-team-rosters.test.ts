import { describe, expect, it } from "vitest";
import { mergeTeamRosters } from "@/lib/merge-team-rosters";
import type { TeamRoster } from "@/lib/team-roster-types";

describe("mergeTeamRosters", () => {
  const seed: TeamRoster[] = [
    {
      id: "seed-a",
      registrationId: "reg-a",
      clubName: "C",
      teamName: "T",
      tournamentSlug: "t",
      tournamentName: "T",
      categoryId: "c",
      divisionLabel: "D",
      coachName: "Seed",
      coachPhone: "",
      players: [{ id: "p1", fullName: "One" }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  it("prefers stored roster for the same registrationId", () => {
    const stored: TeamRoster[] = [
      {
        id: "local-1",
        registrationId: "reg-a",
        clubName: "C",
        teamName: "T",
        tournamentSlug: "t",
        tournamentName: "T",
        categoryId: "c",
        divisionLabel: "D",
        coachName: "Local",
        coachPhone: "123",
        players: [{ id: "p2", fullName: "Two" }],
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const out = mergeTeamRosters(seed, stored);
    expect(out).toHaveLength(1);
    expect(out[0].coachName).toBe("Local");
    expect(out[0].id).toBe("local-1");
  });

  it("appends stored-only registration rosters", () => {
    const stored: TeamRoster[] = [
      {
        id: "local-b",
        registrationId: "reg-b",
        clubName: "C2",
        teamName: "T2",
        tournamentSlug: "t",
        tournamentName: "T",
        categoryId: "c",
        divisionLabel: "D",
        coachName: "",
        coachPhone: "",
        players: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const out = mergeTeamRosters(seed, stored);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.registrationId).sort()).toEqual(["reg-a", "reg-b"]);
  });
});
