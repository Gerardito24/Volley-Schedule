import { describe, expect, it } from "vitest";
import {
  dayBefore,
  isTournamentInLiveHighlightWindow,
  localDateString,
} from "@/lib/tournament-active-window";
import type { TournamentMock } from "@/lib/mock-data";

function makeTournament(
  startOn: string,
  endOn: string,
  published = false,
): TournamentMock {
  return {
    slug: "t",
    name: "T",
    description: "",
    locationLabel: "PR",
    venues: [{ label: "PR", courtCount: null }],
    registrationDeadlineOn: startOn,
    tournamentStartsOn: startOn,
    tournamentEndsOn: endOn,
    registrationFeeCents: null,
    publicEntryFeeCents: null,
    promoImageDataUrl: null,
    status: "open",
    divisions: [],
    categories: [],
    schedule: published
      ? {
          published: true,
          categorySchedules: [
            {
              categoryId: "c1",
              teamLabels: {},
              schedulingMeta: null,
              phases: [
                {
                  id: "ph1",
                  templateId: "single_elim",
                  kind: "bracket",
                  pools: [],
                  matches: [{ id: "m1", round: 0, order: 0, home: { kind: "seed", seed: 1 }, away: { kind: "seed", seed: 2 } }],
                },
              ],
              assignments: {},
            },
          ],
        }
      : null,
  } as unknown as TournamentMock;
}

describe("localDateString", () => {
  it("formats a Date correctly", () => {
    expect(localDateString(new Date(2026, 5, 15))).toBe("2026-06-15");
  });
});

describe("dayBefore", () => {
  it("returns the previous calendar day", () => {
    expect(dayBefore("2026-06-15")).toBe("2026-06-14");
  });
  it("crosses month boundaries", () => {
    expect(dayBefore("2026-06-01")).toBe("2026-05-31");
  });
});

describe("isTournamentInLiveHighlightWindow", () => {
  const t = makeTournament("2026-06-15", "2026-06-17");

  it("is NOT visible two days before start", () => {
    expect(isTournamentInLiveHighlightWindow(t, "2026-06-13")).toBe(false);
  });

  it("IS visible one day before start", () => {
    expect(isTournamentInLiveHighlightWindow(t, "2026-06-14")).toBe(true);
  });

  it("IS visible on start day", () => {
    expect(isTournamentInLiveHighlightWindow(t, "2026-06-15")).toBe(true);
  });

  it("IS visible on end day", () => {
    expect(isTournamentInLiveHighlightWindow(t, "2026-06-17")).toBe(true);
  });

  it("is NOT visible after end day", () => {
    expect(isTournamentInLiveHighlightWindow(t, "2026-06-18")).toBe(false);
  });
});
