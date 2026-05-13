import { describe, expect, it } from "vitest";
import {
  normalizeTournament,
  tournaments,
  type RegistrationRowMock,
} from "@/lib/mock-data";
import {
  normalizeDivisionLabelCompare,
  registrationMatchesAdminCategory,
} from "@/lib/registration-category-match";

describe("normalizeDivisionLabelCompare", () => {
  it("treats middot and hyphen separators as equivalent", () => {
    expect(normalizeDivisionLabelCompare("10U · Prueba · Mixto")).toBe(
      normalizeDivisionLabelCompare("10U - Prueba - Mixto"),
    );
  });
});

describe("registrationMatchesAdminCategory", () => {
  const seed = normalizeTournament(
    tournaments.find((t) => t.slug === "torneo-prueba")!,
  );

  it("matches seed registration id to admin category id when semantics align", () => {
    const stored = normalizeTournament({
      ...seed,
      categories: seed.categories.map((c) =>
        c.id === "tp-10" ? { ...c, id: "admin-cat-reassigned-10" } : c,
      ),
    });
    const row: RegistrationRowMock = {
      id: "x",
      tournamentSlug: "torneo-prueba",
      tournamentName: seed.name,
      divisionLabel: "10U · Prueba · Mixto",
      teamName: "T",
      clubName: "C",
      status: "approved",
      updatedAt: "2026-05-04",
      feeCents: 15000,
      registeredAt: "2026-05-04T12:00:00.000Z",
      categoryId: "tp-10",
      subdivisionId: null,
    };
    expect(
      registrationMatchesAdminCategory(
        row,
        stored,
        "admin-cat-reassigned-10",
        seed,
      ),
    ).toBe(true);
  });

  it("returns false for a different age bucket", () => {
    const stored = normalizeTournament({
      ...seed,
      categories: seed.categories.map((c) =>
        c.id === "tp-12" ? { ...c, id: "admin-cat-reassigned-12" } : c,
      ),
    });
    const row: RegistrationRowMock = {
      id: "x",
      tournamentSlug: "torneo-prueba",
      tournamentName: seed.name,
      divisionLabel: "10U · Prueba · Mixto",
      teamName: "T",
      clubName: "C",
      status: "approved",
      updatedAt: "2026-05-04",
      feeCents: 15000,
      registeredAt: "2026-05-04T12:00:00.000Z",
      categoryId: "tp-10",
      subdivisionId: null,
    };
    expect(
      registrationMatchesAdminCategory(
        row,
        stored,
        "admin-cat-reassigned-12",
        seed,
      ),
    ).toBe(false);
  });
});
