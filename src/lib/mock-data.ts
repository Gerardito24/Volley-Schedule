import type { TournamentScheduleMock } from "@/lib/schedule-types";

export type { TournamentScheduleMock } from "@/lib/schedule-types";

export type SubdivisionMock = {
  id: string;
  label: string;
  /** Cupo por subdivisión; null si el cupo vive solo a nivel categoría. */
  maxTeams: number | null;
};

export type CategoryMock = {
  id: string;
  label: string;
  feeCents: number | null;
  maxTeams: number | null;
  subdivisions: SubdivisionMock[];
};

export type TournamentMock = {
  slug: string;
  name: string;
  description: string;
  /** Etiqueta única para listados (se sincroniza con `locations` al guardar). */
  locationLabel: string;
  /** Una o más sedes / lugares del torneo. */
  locations: string[];
  /** Cantidad de canchas disponibles para el torneo; null = no definido. */
  courtCount: number | null;
  registrationDeadlineOn: string;
  tournamentStartsOn: string;
  tournamentEndsOn: string;
  registrationFeeCents: number | null;
  publicEntryFeeCents: number | null;
  promoImageDataUrl: string | null;
  status: "open" | "closed" | "draft";
  categories: CategoryMock[];
  /** Itinerario / brackets; undefined/null = no generado aún. */
  schedule?: TournamentScheduleMock | null;
};

export type RegistrationRowMock = {
  id: string;
  tournamentSlug: string;
  tournamentName: string;
  divisionLabel: string;
  /** Nombre del equipo que compite (ej. "Metro VB 14U"). */
  teamName: string;
  /** Nombre del club al que pertenece el equipo (ej. "Metro VB"). */
  clubName: string;
  status:
    | "draft"
    | "pending_payment"
    | "paid"
    | "under_review"
    | "approved"
    | "rejected"
    | "waitlisted";
  updatedAt: string;
  feeCents: number;
  /** ISO 8601; orden de seeds en bracket = ascendente por esta fecha. */
  registeredAt: string;
  categoryId: string;
  subdivisionId?: string | null;
};

export const tournaments: TournamentMock[] = [
  {
    slug: "copa-30-summer-2026",
    name: "Copa 30 Summer",
    description:
      "Torneo de verano — registro centralizado reemplaza el formulario Cognito legacy.",
    locationLabel: "Puerto Rico",
    locations: ["Puerto Rico"],
    courtCount: null,
    registrationDeadlineOn: "2026-06-08",
    tournamentStartsOn: "2026-06-15",
    tournamentEndsOn: "2026-06-17",
    registrationFeeCents: null,
    publicEntryFeeCents: 600,
    promoImageDataUrl: null,
    status: "open",
    categories: [
      {
        id: "d1",
        label: "14U Femenino",
        feeCents: 25000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "d2",
        label: "16U Masculino",
        feeCents: 27500,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "d3",
        label: "Open Coed",
        feeCents: 30000,
        maxTeams: 12,
        subdivisions: [],
      },
    ],
  },
  {
    slug: "premier-5c-2026",
    name: "Premier 5C",
    description: "Evento Premier — cupos limitados por división.",
    locationLabel: "Bayamón",
    locations: ["Bayamón"],
    courtCount: null,
    registrationDeadlineOn: "2026-06-27",
    tournamentStartsOn: "2026-07-04",
    tournamentEndsOn: "2026-07-06",
    registrationFeeCents: null,
    publicEntryFeeCents: 600,
    promoImageDataUrl: null,
    status: "open",
    categories: [
      {
        id: "d4",
        label: "12U",
        feeCents: 20000,
        maxTeams: 10,
        subdivisions: [],
      },
      {
        id: "d5",
        label: "18U",
        feeCents: 29000,
        maxTeams: 14,
        subdivisions: [],
      },
    ],
  },
];

export const registrationRows: RegistrationRowMock[] = [
  {
    id: "r1",
    tournamentSlug: "copa-30-summer-2026",
    tournamentName: "Copa 30 Summer",
    divisionLabel: "16U Masculino",
    teamName: "Las Piedras VC 16U",
    clubName: "Las Piedras VC",
    status: "paid",
    updatedAt: "2026-05-01",
    feeCents: 27500,
    registeredAt: "2026-05-01T14:00:00.000Z",
    categoryId: "d2",
    subdivisionId: null,
  },
  {
    id: "r2",
    tournamentSlug: "copa-30-summer-2026",
    tournamentName: "Copa 30 Summer",
    divisionLabel: "14U Femenino",
    teamName: "Metro VB 14U",
    clubName: "Metro VB",
    status: "approved",
    updatedAt: "2026-05-02",
    feeCents: 25000,
    registeredAt: "2026-05-02T16:30:00.000Z",
    categoryId: "d1",
    subdivisionId: null,
  },
  {
    id: "r4",
    tournamentSlug: "copa-30-summer-2026",
    tournamentName: "Copa 30 Summer",
    divisionLabel: "14U Femenino",
    teamName: "Bayamón Youth 14U",
    clubName: "Bayamón Youth",
    status: "paid",
    updatedAt: "2026-05-03",
    feeCents: 25000,
    registeredAt: "2026-05-03T11:00:00.000Z",
    categoryId: "d1",
    subdivisionId: null,
  },
  {
    id: "r3",
    tournamentSlug: "premier-5c-2026",
    tournamentName: "Premier 5C",
    divisionLabel: "18U",
    teamName: "Oeste Elite 18U",
    clubName: "Oeste Elite",
    status: "under_review",
    updatedAt: "2026-05-03",
    feeCents: 29000,
    registeredAt: "2026-05-03T09:00:00.000Z",
    categoryId: "d5",
    subdivisionId: null,
  },
];

/** Lista de ubicaciones (compat con datos viejos sin `locations`). */
export function tournamentLocationsList(t: TournamentMock): string[] {
  if (Array.isArray(t.locations) && t.locations.length > 0) {
    return t.locations.map((s) => String(s).trim()).filter(Boolean);
  }
  return t.locationLabel.trim() ? [t.locationLabel.trim()] : [];
}

export function formatTournamentLocationsLine(t: TournamentMock): string {
  const list = tournamentLocationsList(t);
  return list.length ? list.join(" · ") : "—";
}

export function normalizeTournament(t: TournamentMock): TournamentMock {
  const locs = tournamentLocationsList(t);
  const label = locs.length ? locs.join(" · ") : t.locationLabel.trim() || "Por definir";
  return {
    ...t,
    locations: locs.length ? locs : [label],
    locationLabel: label,
    courtCount: t.courtCount ?? null,
  };
}

export function getTournamentBySlug(slug: string): TournamentMock | undefined {
  return tournaments.find((t) => t.slug === slug);
}

export function getRegistrationsByTournamentSlug(
  slug: string,
): RegistrationRowMock[] {
  return registrationRows.filter((r) => r.tournamentSlug === slug);
}
