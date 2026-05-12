import { describe, expect, it } from "vitest";
import {
  filterRegistrationsForReuse,
  filterClubProfilesForReuse,
  applyRegistrationToFormDraft,
  applyClubProfileToFormDraft,
} from "@/lib/registration-reuse";
import type { RegistrationRowMock } from "@/lib/mock-data";
import type { ClubProfile } from "@/lib/club-profile-types";

const BASE_ROW: RegistrationRowMock = {
  id: "r1",
  tournamentSlug: "copa-30",
  tournamentName: "Copa 30 Summer",
  divisionLabel: "14U Open Femenino",
  teamName: "Metro VB 14U",
  clubName: "Metro VB",
  status: "pending_payment",
  updatedAt: "2026-05-01",
  feeCents: 25000,
  registeredAt: "2026-05-01T10:00:00Z",
  categoryId: "cat-1",
  subdivisionId: null,
  clubAffiliationNumber: "FPV-001",
  representative: { name: "Ana Pérez", email: "ana@metro.com", phone: "787-555-0001" },
  coach: {
    name: "Coach Luis",
    affiliationNumber: "FPV-C001",
    nivel: "Nacional I",
    phone: "787-555-0002",
    email: "luis@metro.com",
    photoDataUrl: null,
  },
  hasAssistant: false,
  assistant: null,
  players: [
    { id: "p1", name: "Jugadora 1", jerseyNumber: "1", affiliationNumber: "FPV-P001", birthDate: "2012-01-01" },
    { id: "p2", name: "Jugadora 2", jerseyNumber: "2", affiliationNumber: "FPV-P002", birthDate: "2012-02-01" },
  ],
  comments: "Favorecer canchas cubiertas",
  signatureDataUrl: "data:image/png;base64,abc",
  termsAccepted: true,
};

const OTHER_ROW: RegistrationRowMock = {
  ...BASE_ROW,
  id: "r2",
  tournamentSlug: "premier-5c",
  tournamentName: "Premier 5C",
  teamName: "Norte VB",
  clubName: "Norte",
  divisionLabel: "16U Open Masculino",
  registeredAt: "2026-04-01T08:00:00Z",
  coach: { ...BASE_ROW.coach!, name: "Entrenador Norte" },
};

const PROFILE: ClubProfile = {
  clubSlug: "metro-vb",
  displayName: "Metro VB",
  pueblo: "San Juan",
  clubPhone: "787-555-1000",
  contactName: "Directora Metro",
  contactEmail: "dir@metro.com",
  updatedAt: "2026-05-01T00:00:00Z",
};

describe("filterRegistrationsForReuse", () => {
  const rows = [BASE_ROW, OTHER_ROW];

  it("excludes registrations from the current tournament", () => {
    const result = filterRegistrationsForReuse(rows, "copa-30", "");
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("returns all other tournaments when query is empty", () => {
    const result = filterRegistrationsForReuse(rows, "unknown-slug", "");
    expect(result).toHaveLength(2);
  });

  it("filters by team name", () => {
    const result = filterRegistrationsForReuse(rows, "unknown", "norte");
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("filters by coach name", () => {
    const result = filterRegistrationsForReuse(rows, "unknown", "entrenador norte");
    expect(result.map((r) => r.id)).toEqual(["r2"]);
  });

  it("sorts newest first", () => {
    const result = filterRegistrationsForReuse(rows, "unknown", "");
    expect(result[0].id).toBe("r1");
    expect(result[1].id).toBe("r2");
  });
});

describe("filterClubProfilesForReuse", () => {
  const profiles = [
    PROFILE,
    { ...PROFILE, clubSlug: "caribes", displayName: "Caribes VB", contactName: "Dir Caribes", contactEmail: "dir@caribes.com", pueblo: "Bayamón" },
  ];

  it("returns all when query is empty", () => {
    expect(filterClubProfilesForReuse(profiles, "")).toHaveLength(2);
  });

  it("filters by display name", () => {
    const result = filterClubProfilesForReuse(profiles, "metro");
    expect(result).toHaveLength(1);
    expect(result[0].clubSlug).toBe("metro-vb");
  });

  it("filters by contact name", () => {
    const result = filterClubProfilesForReuse(profiles, "dir caribes");
    expect(result).toHaveLength(1);
    expect(result[0].clubSlug).toBe("caribes");
  });
});

describe("applyRegistrationToFormDraft", () => {
  it("maps all expected fields", () => {
    const draft = applyRegistrationToFormDraft(BASE_ROW);
    expect(draft.clubName).toBe("Metro VB");
    expect(draft.teamName).toBe("Metro VB 14U");
    expect(draft.clubAffiliationNumber).toBe("FPV-001");
    expect(draft.repName).toBe("Ana Pérez");
    expect(draft.repEmail).toBe("ana@metro.com");
    expect(draft.repPhone).toBe("787-555-0001");
    expect(draft.coach.name).toBe("Coach Luis");
    expect(draft.hasAssistant).toBe(false);
    expect(draft.comments).toBe("Favorecer canchas cubiertas");
  });

  it("clones players with new IDs", () => {
    const draft = applyRegistrationToFormDraft(BASE_ROW);
    expect(draft.players).toHaveLength(2);
    expect(draft.players[0].id).not.toBe("p1");
    expect(draft.players[0].name).toBe("Jugadora 1");
  });

  it("handles rows without extended fields gracefully", () => {
    const minimal: RegistrationRowMock = {
      id: "r-min",
      tournamentSlug: "t",
      tournamentName: "T",
      divisionLabel: "14U",
      teamName: "Club",
      clubName: "Club",
      status: "pending_payment",
      updatedAt: "2026-01-01",
      feeCents: 0,
      registeredAt: "2026-01-01T00:00:00Z",
      categoryId: "c",
    };
    const draft = applyRegistrationToFormDraft(minimal);
    expect(draft.repName).toBe("");
    expect(draft.players).toHaveLength(0);
    expect(draft.coach.name).toBe("");
  });
});

describe("applyClubProfileToFormDraft", () => {
  it("maps club name and representative fields", () => {
    const draft = applyClubProfileToFormDraft(PROFILE);
    expect(draft.clubName).toBe("Metro VB");
    expect(draft.repName).toBe("Directora Metro");
    expect(draft.repEmail).toBe("dir@metro.com");
    expect(draft.repPhone).toBe("787-555-1000");
  });
});
