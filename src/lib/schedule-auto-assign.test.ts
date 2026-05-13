import { describe, expect, it } from "vitest";
import type { CategoryScheduleMock, SchedulePhaseMock } from "@/lib/schedule-types";
import {
  assignSlotsGreedy,
  assignSlotsGreedyShared,
  buildOccupancyFromSchedules,
  buildOrderedMatchIds,
  findGlobalAssignmentConflict,
  parseDurationToMinutes,
  parseFlexibleLocalDatetime,
} from "@/lib/schedule-auto-assign";
import { flattenTournamentCourts } from "@/lib/tournament-courts";

describe("parseDurationToMinutes", () => {
  it("acepta H:mm y HH:mm", () => {
    expect(parseDurationToMinutes("1:30")).toBe(90);
    expect(parseDurationToMinutes("01:30")).toBe(90);
    expect(parseDurationToMinutes("0:45")).toBe(45);
  });

  it("acepta minutos enteros como string", () => {
    expect(parseDurationToMinutes("90")).toBe(90);
  });

  it("rechaza inválidos", () => {
    expect(parseDurationToMinutes("")).toBeNull();
    expect(parseDurationToMinutes("1:99")).toBeNull();
    expect(parseDurationToMinutes("abc")).toBeNull();
    expect(parseDurationToMinutes("0")).toBeNull();
    expect(parseDurationToMinutes("0:00")).toBeNull();
  });
});

function minimalPhase(matches: { id: string; round: number; order: number }[]): SchedulePhaseMock {
  return {
    id: "ph1",
    kind: "single_elim",
    templateId: "single_elim",
    config: {},
    pools: [],
    matches: matches.map((m) => ({
      id: m.id,
      phaseId: "ph1",
      round: m.round,
      orderInRound: m.order,
      home: { type: "bye" as const },
      away: { type: "bye" as const },
    })),
  };
}

describe("assignSlotsGreedy", () => {
  it("con 2 canchas y 4 partidos alterna sin solapes en misma cancha", () => {
    const phases = [
      minimalPhase([
        { id: "a", round: 0, order: 0 },
        { id: "b", round: 0, order: 1 },
        { id: "c", round: 0, order: 2 },
        { id: "d", round: 0, order: 3 },
      ]),
    ];
    const order = buildOrderedMatchIds(phases);
    expect(order).toEqual(["a", "b", "c", "d"]);

    const first = parseFlexibleLocalDatetime("2026-06-15T10:00:00");
    expect(first).not.toBeNull();

    const res = assignSlotsGreedy({
      phases,
      firstStart: first!,
      durationMinutes: 60,
      courtCount: 2,
      tournamentStartsOn: "2026-06-15",
      tournamentEndsOn: "2026-06-20",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.assignments.a?.courtLabel).toBe("Cancha 1");
    expect(res.assignments.b?.courtLabel).toBe("Cancha 2");
    expect(res.assignments.c?.courtLabel).toBe("Cancha 1");
    expect(res.assignments.d?.courtLabel).toBe("Cancha 2");

    const ta = parseFlexibleLocalDatetime(res.assignments.a!.startsAt!)!.getTime();
    const tb = parseFlexibleLocalDatetime(res.assignments.b!.startsAt!)!.getTime();
    const tc = parseFlexibleLocalDatetime(res.assignments.c!.startsAt!)!.getTime();
    const td = parseFlexibleLocalDatetime(res.assignments.d!.startsAt!)!.getTime();

    expect(tb).toBe(ta);
    expect(tc).toBe(ta + 60 * 60_000);
    expect(td).toBe(tb + 60 * 60_000);
  });

  it("falla si no caben todos los partidos en el último día del torneo", () => {
    const phases = [
      minimalPhase([
        { id: "m1", round: 0, order: 0 },
        { id: "m2", round: 0, order: 1 },
      ]),
    ];
    const first = parseFlexibleLocalDatetime("2026-06-15T22:00:00");
    expect(first).not.toBeNull();

    const res = assignSlotsGreedy({
      phases,
      firstStart: first!,
      durationMinutes: 90,
      courtCount: 1,
      tournamentStartsOn: "2026-06-15",
      tournamentEndsOn: "2026-06-15",
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/No caben todos/i);
  });
});

describe("assignSlotsGreedyShared", () => {
  const courts = flattenTournamentCourts([{ label: "Arena", courtCount: 2 }]);
  const day = "2026-06-15";
  const t8 = parseFlexibleLocalDatetime(`${day}T08:00:00`)!;
  const t10 = parseFlexibleLocalDatetime(`${day}T10:00:00`)!;

  it("empuja el inicio si otra categoría ocupa ambas canchas 8–10", () => {
    const phases = [
      minimalPhase([
        { id: "m1", round: 0, order: 0 },
        { id: "m2", round: 0, order: 1 },
      ]),
    ];
    const existing = [
      { courtId: "v0-c1", startMs: t8.getTime(), endMs: t10.getTime() },
      { courtId: "v0-c2", startMs: t8.getTime(), endMs: t10.getTime() },
    ];
    const res = assignSlotsGreedyShared({
      phases,
      firstStart: t8,
      durationMinutes: 60,
      allowedCourtIds: ["v0-c1", "v0-c2"],
      courts,
      existingOccupancy: existing,
      tournamentStartsOn: day,
      tournamentEndsOn: "2026-06-20",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const tFirst = parseFlexibleLocalDatetime(res.assignments.m1!.startsAt!)!.getTime();
    expect(tFirst).toBe(t10.getTime());
    expect(res.assignments.m1?.courtId).toBeDefined();
    expect(res.assignments.m1?.courtLabel).toContain("Arena");
  });

  it("buildOccupancyFromSchedules respeta excludeCategoryId", () => {
    const catA: CategoryScheduleMock = {
      categoryId: "cat-a",
      teamLabels: ["x", "y"],
      phases: [minimalPhase([{ id: "x1", round: 0, order: 0 }])],
      assignments: {
        x1: {
          startsAt: "2026-06-15T08:00:00",
          courtLabel: courts[0]!.label,
          courtId: "v0-c1",
        },
      },
      schedulingMeta: { durationMinutes: 60, courtCount: 1, allowedCourtIds: ["v0-c1"] },
    };
    const occ = buildOccupancyFromSchedules([catA], courts, "cat-a");
    expect(occ).toHaveLength(0);
    const occ2 = buildOccupancyFromSchedules([catA], courts, null);
    expect(occ2).toHaveLength(1);
  });
});

describe("findGlobalAssignmentConflict", () => {
  const courts = flattenTournamentCourts([{ label: "Arena", courtCount: 1 }]);
  const cat: CategoryScheduleMock = {
    categoryId: "c1",
    teamLabels: ["a", "b"],
    phases: [
      minimalPhase([
        { id: "m1", round: 0, order: 0 },
        { id: "m2", round: 0, order: 1 },
      ]),
    ],
    assignments: {
      m1: {
        startsAt: "2026-06-15T08:00:00",
        courtLabel: courts[0]!.label,
        courtId: "v0-c1",
      },
      m2: {
        startsAt: "2026-06-15T10:00:00",
        courtLabel: courts[0]!.label,
        courtId: "v0-c1",
      },
    },
    schedulingMeta: { durationMinutes: 60, courtCount: 1, allowedCourtIds: ["v0-c1"] },
  };

  it("detecta solape con otra categoría", () => {
    const other: CategoryScheduleMock = {
      ...cat,
      categoryId: "c2",
      assignments: {
        o1: {
          startsAt: "2026-06-15T08:30:00",
          courtLabel: courts[0]!.label,
          courtId: "v0-c1",
        },
      },
      phases: [minimalPhase([{ id: "o1", round: 0, order: 0 }])],
    };
    const msg = findGlobalAssignmentConflict({
      categorySchedules: [cat, other],
      courts,
      focusCategoryId: "c2",
      focusMatchId: "o1",
      focusAssignments: other.assignments,
      focusDurationMinutes: 60,
    });
    expect(msg).toMatch(/otra categoría/i);
  });

  it("no hay conflicto si horarios no se solapan", () => {
    const msg = findGlobalAssignmentConflict({
      categorySchedules: [cat],
      courts,
      focusCategoryId: "c1",
      focusMatchId: "m2",
      focusAssignments: cat.assignments,
      focusDurationMinutes: 60,
    });
    expect(msg).toBeNull();
  });
});
