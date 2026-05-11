export type SubdivisionMock = {
  id: string;
  label: string;
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
  locationLabel: string;
  registrationDeadlineOn: string;
  tournamentStartsOn: string;
  tournamentEndsOn: string;
  registrationFeeCents: number | null;
  publicEntryFeeCents: number | null;
  promoImageDataUrl: string | null;
  status: "open" | "closed" | "draft";
  categories: CategoryMock[];
};

export type RegistrationRowMock = {
  id: string;
  tournamentSlug: string;
  tournamentName: string;
  divisionLabel: string;
  teamName: string;
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
};

export const tournaments: TournamentMock[] = [
  {
    slug: "copa-30-summer-2026",
    name: "Copa 30 Summer",
    description:
      "Torneo de verano — registro centralizado reemplaza el formulario Cognito legacy.",
    locationLabel: "Puerto Rico",
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
    teamName: "Las Piedras VC",
    status: "pending_payment",
    updatedAt: "2026-05-01",
    feeCents: 27500,
  },
  {
    id: "r2",
    tournamentSlug: "copa-30-summer-2026",
    tournamentName: "Copa 30 Summer",
    divisionLabel: "14U Femenino",
    teamName: "Metro VB",
    status: "approved",
    updatedAt: "2026-05-02",
    feeCents: 25000,
  },
  {
    id: "r3",
    tournamentSlug: "premier-5c-2026",
    tournamentName: "Premier 5C",
    divisionLabel: "18U",
    teamName: "Oeste Elite",
    status: "under_review",
    updatedAt: "2026-05-03",
    feeCents: 29000,
  },
];

export function getTournamentBySlug(slug: string): TournamentMock | undefined {
  return tournaments.find((t) => t.slug === slug);
}

export function getRegistrationsByTournamentSlug(
  slug: string,
): RegistrationRowMock[] {
  return registrationRows.filter((r) => r.tournamentSlug === slug);
}
