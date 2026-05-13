import { describe, expect, it } from "vitest";
import type { ScheduleAssignmentMock } from "@/lib/schedule-types";
import {
  flattenTournamentCourts,
  legacyCanchaNumberToCourtId,
  resolveCourtIdFromAssignment,
} from "@/lib/tournament-courts";

describe("flattenTournamentCourts", () => {
  it("aplana por sede y omite sin courtCount", () => {
    const courts = flattenTournamentCourts([
      { label: "Arena", courtCount: 2 },
      { label: "Sin número", courtCount: null },
      { label: "Club", courtCount: 1 },
    ]);
    expect(courts.map((c) => c.id)).toEqual(["v0-c1", "v0-c2", "v2-c1"]);
    expect(courts[0]?.label).toBe("Arena · Cancha 1");
    expect(courts[2]?.label).toBe("Club · Cancha 1");
  });
});

describe("resolveCourtIdFromAssignment", () => {
  const courts = flattenTournamentCourts([{ label: "X", courtCount: 3 }]);

  it("resuelve courtId válido", () => {
    const a: ScheduleAssignmentMock = { courtId: "v0-c2", courtLabel: "x" };
    expect(resolveCourtIdFromAssignment(a, courts)).toBe("v0-c2");
  });

  it("resuelve etiqueta exacta", () => {
    const a: ScheduleAssignmentMock = { courtLabel: "X · Cancha 2" };
    expect(resolveCourtIdFromAssignment(a, courts)).toBe("v0-c2");
  });

  it("resuelve legacy Cancha N", () => {
    const a: ScheduleAssignmentMock = { courtLabel: "Cancha 3" };
    expect(resolveCourtIdFromAssignment(a, courts)).toBe("v0-c3");
  });
});

describe("legacyCanchaNumberToCourtId", () => {
  const courts = flattenTournamentCourts([{ label: "X", courtCount: 2 }]);
  it("devuelve null si N fuera de rango", () => {
    expect(legacyCanchaNumberToCourtId(courts, 0)).toBeNull();
    expect(legacyCanchaNumberToCourtId(courts, 3)).toBeNull();
  });
});
