import type { TournamentScheduleMock } from "@/lib/schedule-types";
import type { ClubProfile } from "@/lib/club-profile-types";

export type { TournamentScheduleMock } from "@/lib/schedule-types";

/** Firma mínima válida (1×1 PNG) para filas seed con formulario completo. */
export const SEED_SIGNATURE_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export type SubdivisionMock = {
  id: string;
  label: string;
  /** Cupo por subdivisión; null si el cupo vive solo a nivel categoría. */
  maxTeams: number | null;
};

/** División global del torneo (ej. Oro, Open). Las categorías referencian `divisionId`. */
export type TournamentDivisionMock = {
  id: string;
  label: string;
};

export type CategoryGender = "masculino" | "femenino" | "mixto";

export const CATEGORY_GENDER_LABELS: Record<CategoryGender, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  mixto: "Mixto",
};

export function categoryGenderLabel(g: CategoryGender | undefined | null): string {
  if (!g) return "";
  return CATEGORY_GENDER_LABELS[g] ?? "";
}

export function parseCategoryGender(value: unknown): CategoryGender {
  if (value === "masculino" || value === "femenino" || value === "mixto") return value;
  return "mixto";
}

function inferGenderFromDivisionLabel(divLabel: string): CategoryGender | null {
  const t = divLabel.trim().toLowerCase();
  if (t === "femenino" || /\bfemenin\b/.test(t)) return "femenino";
  if (t === "masculino" || /\bmasculin\b/.test(t)) return "masculino";
  if (/\bcoed\b/.test(t) || /\bmixto\b/.test(t)) return "mixto";
  return null;
}

export type CategoryMock = {
  id: string;
  /** Nombre mostrado / en listados; por defecto deriva de edad + división + género si `categoryTitleManual` es false. */
  label: string;
  /** Solo edad o bracket (ej. 14U); el grupo es la división del torneo. */
  ageLabel: string;
  /** Una de `TournamentMock.divisions`. */
  divisionId: string;
  /** Masculino, Femenino o Mixto — entra en el nombre automático de la categoría. */
  gender: CategoryGender;
  /** Si true, `label` fue fijado a mano (doble clic) y no se recalcula al cambiar edad/división/género. */
  categoryTitleManual?: boolean;
  feeCents: number | null;
  maxTeams: number | null;
  subdivisions: SubdivisionMock[];
};

export type TournamentVenue = {
  label: string;
  /** Canchas en esa sede; null = sin definir. */
  courtCount: number | null;
};

export type TournamentMock = {
  slug: string;
  name: string;
  description: string;
  /** Etiqueta única para listados (se deriva de `venues` al guardar). */
  locationLabel: string;
  /** Sedes del torneo; cada una tiene su cantidad de canchas. */
  venues: TournamentVenue[];
  registrationDeadlineOn: string;
  tournamentStartsOn: string;
  tournamentEndsOn: string;
  registrationFeeCents: number | null;
  publicEntryFeeCents: number | null;
  promoImageDataUrl: string | null;
  status: "open" | "closed" | "draft";
  /** Divisiones que el torneo ofrece; cada categoría elige una. */
  divisions: TournamentDivisionMock[];
  categories: CategoryMock[];
  /** Itinerario / brackets; undefined/null = no generado aún. */
  schedule?: TournamentScheduleMock | null;
  /** When true, omit from public home/tournaments/itinerarios; direct URL returns 404. */
  hiddenFromPublic?: boolean;
};

/** Synthetic tournament slug for club-only registration (local storage pipeline). */
export const CLUB_REGISTRY_SLUG = "__club_registry__" as const;

export type PlayerEntry = {
  id: string;
  name: string;
  jerseyNumber: string;
  affiliationNumber: string;
  birthDate: string;
};

export type CoachEntry = {
  name: string;
  affiliationNumber: string;
  nivel: string;
  phone: string;
  email: string;
  photoDataUrl?: string | null;
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
  // Extended fields (Cognito replica)
  clubAffiliationNumber?: string;
  representative?: { name: string; email: string; phone: string };
  coach?: CoachEntry;
  hasAssistant?: boolean;
  assistant?: CoachEntry | null;
  players?: PlayerEntry[];
  comments?: string;
  signatureDataUrl?: string | null;
  termsAccepted?: boolean;
};

export const tournaments: TournamentMock[] = [
  {
    slug: "copa-30-summer-2026",
    name: "Copa 30 Summer",
    description:
      "Torneo de verano — registro centralizado reemplaza el formulario Cognito legacy.",
    locationLabel: "Puerto Rico",
    venues: [{ label: "Puerto Rico", courtCount: null }],
    registrationDeadlineOn: "2026-06-08",
    tournamentStartsOn: "2026-06-15",
    tournamentEndsOn: "2026-06-17",
    registrationFeeCents: null,
    publicEntryFeeCents: 600,
    promoImageDataUrl: null,
    status: "open",
    divisions: [
      { id: "div-c30-open", label: "Open" },
      { id: "div-c30-rec", label: "Recreativo" },
    ],
    categories: [
      {
        id: "d1",
        label: "14U Open Femenino",
        ageLabel: "14U",
        divisionId: "div-c30-open",
        gender: "femenino",
        feeCents: 25000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "d2",
        label: "16U Open Masculino",
        ageLabel: "16U",
        divisionId: "div-c30-open",
        gender: "masculino",
        feeCents: 27500,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "d3",
        label: "Open Recreativo Mixto",
        ageLabel: "Open",
        divisionId: "div-c30-rec",
        gender: "mixto",
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
    venues: [{ label: "Bayamón", courtCount: null }],
    registrationDeadlineOn: "2026-06-27",
    tournamentStartsOn: "2026-07-04",
    tournamentEndsOn: "2026-07-06",
    registrationFeeCents: null,
    publicEntryFeeCents: 600,
    promoImageDataUrl: null,
    status: "open",
    divisions: [{ id: "div-p5c-main", label: "Premier" }],
    categories: [
      {
        id: "d4",
        label: "12U Premier Mixto",
        ageLabel: "12U",
        divisionId: "div-p5c-main",
        gender: "mixto",
        feeCents: 20000,
        maxTeams: 10,
        subdivisions: [],
      },
      {
        id: "d5",
        label: "18U Premier Mixto",
        ageLabel: "18U",
        divisionId: "div-p5c-main",
        gender: "mixto",
        feeCents: 29000,
        maxTeams: 14,
        subdivisions: [],
      },
    ],
  },
  {
    slug: "torneo-prueba",
    name: "Torneo Prueba",
    description: "Torneo de datos de prueba: 8 clubes 10U–14U para validar flujos.",
    locationLabel: "Carolina",
    venues: [{ label: "Arena Prueba", courtCount: 4 }],
    registrationDeadlineOn: "2026-05-20",
    tournamentStartsOn: "2026-05-13",
    tournamentEndsOn: "2026-05-15",
    registrationFeeCents: null,
    publicEntryFeeCents: 500,
    promoImageDataUrl: null,
    status: "open",
    divisions: [{ id: "div-tp-prueba", label: "Prueba" }],
    categories: [
      {
        id: "tp-10",
        label: "10U Prueba Mixto",
        ageLabel: "10U",
        divisionId: "div-tp-prueba",
        gender: "mixto",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "tp-11",
        label: "11U Prueba Mixto",
        ageLabel: "11U",
        divisionId: "div-tp-prueba",
        gender: "mixto",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "tp-12",
        label: "12U Prueba Mixto",
        ageLabel: "12U",
        divisionId: "div-tp-prueba",
        gender: "mixto",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "tp-13",
        label: "13U Prueba Mixto",
        ageLabel: "13U",
        divisionId: "div-tp-prueba",
        gender: "mixto",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "tp-14",
        label: "14U Prueba Mixto",
        ageLabel: "14U",
        divisionId: "div-tp-prueba",
        gender: "mixto",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "tp-10f",
        label: "10U Prueba Femenino",
        ageLabel: "10U",
        divisionId: "div-tp-prueba",
        gender: "femenino",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "tp-11m",
        label: "11U Prueba Masculino",
        ageLabel: "11U",
        divisionId: "div-tp-prueba",
        gender: "masculino",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "tp-12f",
        label: "12U Prueba Femenino",
        ageLabel: "12U",
        divisionId: "div-tp-prueba",
        gender: "femenino",
        feeCents: 15000,
        maxTeams: 16,
        subdivisions: [],
      },
    ],
  },
  {
    slug: CLUB_REGISTRY_SLUG,
    name: "Registro de club (sistema)",
    description:
      "Uso interno: las inscripciones bajo este torneo enlazan el club con el panel de administración igual que un torneo real.",
    locationLabel: "—",
    venues: [{ label: "—", courtCount: null }],
    registrationDeadlineOn: "2099-12-31",
    tournamentStartsOn: "2099-01-01",
    tournamentEndsOn: "2099-01-02",
    registrationFeeCents: 0,
    publicEntryFeeCents: null,
    promoImageDataUrl: null,
    status: "open",
    hiddenFromPublic: true,
    divisions: [{ id: "div-club-registry", label: "Club" }],
    categories: [
      {
        id: "cat-club-registry",
        label: "Registro general",
        ageLabel: "Club",
        divisionId: "div-club-registry",
        gender: "mixto",
        feeCents: 0,
        maxTeams: null,
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
    divisionLabel: "16U · Open · Masculino",
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
    divisionLabel: "14U · Open · Femenino",
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
    divisionLabel: "14U · Open · Femenino",
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
    divisionLabel: "18U · Premier · Mixto",
    teamName: "Oeste Elite 18U",
    clubName: "Oeste Elite",
    status: "under_review",
    updatedAt: "2026-05-03",
    feeCents: 29000,
    registeredAt: "2026-05-03T09:00:00.000Z",
    categoryId: "d5",
    subdivisionId: null,
  },
  {
    id: "tp-reg-01",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "10U · Prueba · Mixto",
    teamName: "10U · Mixto · Coach Prueba 1",
    clubName: "Club Prueba 1",
    status: "approved",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:00:00.000Z",
    categoryId: "tp-10",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1001",
    representative: {
      name: "Apoderado prueba 1",
      email: "apoderado1-prueba@test.local",
      phone: "787-201-1001",
    },
    coach: {
      name: "Coach Prueba 1",
      affiliationNumber: "FPV-COACH-1001",
      nivel: "Regional",
      phone: "787-202-1001",
      email: "coach1-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-01-a",
        name: "Jugador prueba 1A",
        jerseyNumber: "4",
        affiliationNumber: "FPV-J101",
        birthDate: "2016-01-10",
      },
      {
        id: "tp-pl-01-b",
        name: "Jugador prueba 1B",
        jerseyNumber: "7",
        affiliationNumber: "FPV-J102",
        birthDate: "2016-02-15",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
  {
    id: "tp-reg-02",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "11U · Prueba · Mixto",
    teamName: "11U · Mixto · Coach Prueba 2",
    clubName: "Club Prueba 2",
    status: "paid",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:05:00.000Z",
    categoryId: "tp-11",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1002",
    representative: {
      name: "Apoderado prueba 2",
      email: "apoderado2-prueba@test.local",
      phone: "787-201-1002",
    },
    coach: {
      name: "Coach Prueba 2",
      affiliationNumber: "FPV-COACH-1002",
      nivel: "Regional",
      phone: "787-202-1002",
      email: "coach2-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-02-a",
        name: "Jugador prueba 2A",
        jerseyNumber: "5",
        affiliationNumber: "FPV-J201",
        birthDate: "2015-04-12",
      },
      {
        id: "tp-pl-02-b",
        name: "Jugador prueba 2B",
        jerseyNumber: "9",
        affiliationNumber: "FPV-J202",
        birthDate: "2015-06-01",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
  {
    id: "tp-reg-03",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "12U · Prueba · Mixto",
    teamName: "12U · Mixto · Coach Prueba 3",
    clubName: "Club Prueba 3",
    status: "approved",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:10:00.000Z",
    categoryId: "tp-12",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1003",
    representative: {
      name: "Apoderado prueba 3",
      email: "apoderado3-prueba@test.local",
      phone: "787-201-1003",
    },
    coach: {
      name: "Coach Prueba 3",
      affiliationNumber: "FPV-COACH-1003",
      nivel: "Regional",
      phone: "787-202-1003",
      email: "coach3-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-03-a",
        name: "Jugador prueba 3A",
        jerseyNumber: "2",
        affiliationNumber: "FPV-J301",
        birthDate: "2014-01-20",
      },
      {
        id: "tp-pl-03-b",
        name: "Jugador prueba 3B",
        jerseyNumber: "11",
        affiliationNumber: "FPV-J302",
        birthDate: "2014-03-08",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
  {
    id: "tp-reg-04",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "13U · Prueba · Mixto",
    teamName: "13U · Mixto · Coach Prueba 4",
    clubName: "Club Prueba 4",
    status: "paid",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:15:00.000Z",
    categoryId: "tp-13",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1004",
    representative: {
      name: "Apoderado prueba 4",
      email: "apoderado4-prueba@test.local",
      phone: "787-201-1004",
    },
    coach: {
      name: "Coach Prueba 4",
      affiliationNumber: "FPV-COACH-1004",
      nivel: "Regional",
      phone: "787-202-1004",
      email: "coach4-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-04-a",
        name: "Jugador prueba 4A",
        jerseyNumber: "1",
        affiliationNumber: "FPV-J401",
        birthDate: "2013-05-05",
      },
      {
        id: "tp-pl-04-b",
        name: "Jugador prueba 4B",
        jerseyNumber: "8",
        affiliationNumber: "FPV-J402",
        birthDate: "2013-07-22",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
  {
    id: "tp-reg-05",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "14U · Prueba · Mixto",
    teamName: "14U · Mixto · Coach Prueba 5",
    clubName: "Club Prueba 5",
    status: "approved",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:20:00.000Z",
    categoryId: "tp-14",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1005",
    representative: {
      name: "Apoderado prueba 5",
      email: "apoderado5-prueba@test.local",
      phone: "787-201-1005",
    },
    coach: {
      name: "Coach Prueba 5",
      affiliationNumber: "FPV-COACH-1005",
      nivel: "Regional",
      phone: "787-202-1005",
      email: "coach5-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-05-a",
        name: "Jugador prueba 5A",
        jerseyNumber: "3",
        affiliationNumber: "FPV-J501",
        birthDate: "2012-02-28",
      },
      {
        id: "tp-pl-05-b",
        name: "Jugador prueba 5B",
        jerseyNumber: "10",
        affiliationNumber: "FPV-J502",
        birthDate: "2012-04-10",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
  {
    id: "tp-reg-06",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "10U · Prueba · Femenino",
    teamName: "10U · Femenino · Coach Prueba 6",
    clubName: "Club Prueba 6",
    status: "paid",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:25:00.000Z",
    categoryId: "tp-10f",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1006",
    representative: {
      name: "Apoderado prueba 6",
      email: "apoderado6-prueba@test.local",
      phone: "787-201-1006",
    },
    coach: {
      name: "Coach Prueba 6",
      affiliationNumber: "FPV-COACH-1006",
      nivel: "Regional",
      phone: "787-202-1006",
      email: "coach6-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-06-a",
        name: "Jugador prueba 6A",
        jerseyNumber: "6",
        affiliationNumber: "FPV-J601",
        birthDate: "2016-08-01",
      },
      {
        id: "tp-pl-06-b",
        name: "Jugador prueba 6B",
        jerseyNumber: "12",
        affiliationNumber: "FPV-J602",
        birthDate: "2016-09-12",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
  {
    id: "tp-reg-07",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "11U · Prueba · Masculino",
    teamName: "11U · Masculino · Coach Prueba 7",
    clubName: "Club Prueba 7",
    status: "approved",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:30:00.000Z",
    categoryId: "tp-11m",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1007",
    representative: {
      name: "Apoderado prueba 7",
      email: "apoderado7-prueba@test.local",
      phone: "787-201-1007",
    },
    coach: {
      name: "Coach Prueba 7",
      affiliationNumber: "FPV-COACH-1007",
      nivel: "Regional",
      phone: "787-202-1007",
      email: "coach7-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-07-a",
        name: "Jugador prueba 7A",
        jerseyNumber: "4",
        affiliationNumber: "FPV-J701",
        birthDate: "2015-01-05",
      },
      {
        id: "tp-pl-07-b",
        name: "Jugador prueba 7B",
        jerseyNumber: "15",
        affiliationNumber: "FPV-J702",
        birthDate: "2015-02-14",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
  {
    id: "tp-reg-08",
    tournamentSlug: "torneo-prueba",
    tournamentName: "Torneo Prueba",
    divisionLabel: "12U · Prueba · Femenino",
    teamName: "12U · Femenino · Coach Prueba 8",
    clubName: "Club Prueba 8",
    status: "paid",
    updatedAt: "2026-05-04",
    feeCents: 15000,
    registeredAt: "2026-05-04T10:35:00.000Z",
    categoryId: "tp-12f",
    subdivisionId: null,
    clubAffiliationNumber: "FPV-CLUB-1008",
    representative: {
      name: "Apoderado prueba 8",
      email: "apoderado8-prueba@test.local",
      phone: "787-201-1008",
    },
    coach: {
      name: "Coach Prueba 8",
      affiliationNumber: "FPV-COACH-1008",
      nivel: "Regional",
      phone: "787-202-1008",
      email: "coach8-prueba@test.local",
      photoDataUrl: null,
    },
    hasAssistant: false,
    assistant: null,
    players: [
      {
        id: "tp-pl-08-a",
        name: "Jugador prueba 8A",
        jerseyNumber: "2",
        affiliationNumber: "FPV-J801",
        birthDate: "2014-06-06",
      },
      {
        id: "tp-pl-08-b",
        name: "Jugador prueba 8B",
        jerseyNumber: "9",
        affiliationNumber: "FPV-J802",
        birthDate: "2014-07-19",
      },
    ],
    comments: "Inscripción seed de prueba.",
    signatureDataUrl: SEED_SIGNATURE_PNG_DATA_URL,
    termsAccepted: true,
  },
];

/** Perfiles seed para Club Prueba 1–8 (merge con `localStorage` en admin → Equipos). */
export const seedClubProfiles: ClubProfile[] = [
  {
    clubSlug: "club-prueba-1",
    displayName: "Club Prueba 1",
    pueblo: "San Juan",
    clubPhone: "787-301-1001",
    contactName: "Apoderado prueba 1",
    contactEmail: "club1-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
  {
    clubSlug: "club-prueba-2",
    displayName: "Club Prueba 2",
    pueblo: "Bayamón",
    clubPhone: "787-301-1002",
    contactName: "Apoderado prueba 2",
    contactEmail: "club2-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
  {
    clubSlug: "club-prueba-3",
    displayName: "Club Prueba 3",
    pueblo: "Carolina",
    clubPhone: "787-301-1003",
    contactName: "Apoderado prueba 3",
    contactEmail: "club3-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
  {
    clubSlug: "club-prueba-4",
    displayName: "Club Prueba 4",
    pueblo: "Guaynabo",
    clubPhone: "787-301-1004",
    contactName: "Apoderado prueba 4",
    contactEmail: "club4-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
  {
    clubSlug: "club-prueba-5",
    displayName: "Club Prueba 5",
    pueblo: "Caguas",
    clubPhone: "787-301-1005",
    contactName: "Apoderado prueba 5",
    contactEmail: "club5-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
  {
    clubSlug: "club-prueba-6",
    displayName: "Club Prueba 6",
    pueblo: "Ponce",
    clubPhone: "787-301-1006",
    contactName: "Apoderado prueba 6",
    contactEmail: "club6-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
  {
    clubSlug: "club-prueba-7",
    displayName: "Club Prueba 7",
    pueblo: "Mayagüez",
    clubPhone: "787-301-1007",
    contactName: "Apoderado prueba 7",
    contactEmail: "club7-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
  {
    clubSlug: "club-prueba-8",
    displayName: "Club Prueba 8",
    pueblo: "Humacao",
    clubPhone: "787-301-1008",
    contactName: "Apoderado prueba 8",
    contactEmail: "club8-perfil@test.local",
    updatedAt: "2026-05-04T12:00:00.000Z",
  },
];

/** Lista de nombres de sede (solo etiquetas). */
export function tournamentLocationsList(t: TournamentMock): string[] {
  const raw = t as unknown as {
    venues?: TournamentVenue[];
    locations?: string[];
    locationLabel?: string;
  };
  if (Array.isArray(raw.venues) && raw.venues.length > 0) {
    return raw.venues.map((v) => String(v.label ?? "").trim()).filter(Boolean);
  }
  if (Array.isArray(raw.locations) && raw.locations.length > 0) {
    return raw.locations.map((s) => String(s).trim()).filter(Boolean);
  }
  const lb = String(raw.locationLabel ?? "").trim();
  return lb ? [lb] : [];
}

export function formatTournamentLocationsLine(t: TournamentMock): string {
  const list = tournamentLocationsList(t);
  return list.length ? list.join(" · ") : "—";
}

/** Título por defecto: `edad división género` (espacios), ej. `17U Open Femenino`. */
export function buildDefaultCategoryLabel(
  ageLabel: string,
  divisionId: string,
  divisions: { id: string; label: string }[],
  gender: CategoryGender,
): string {
  const age = ageLabel.trim();
  const d = divisions.find((x) => x.id === divisionId);
  const dlab = (d?.label ?? "").trim();
  const glab = categoryGenderLabel(gender).trim();
  const parts: string[] = [];
  if (age) parts.push(age);
  if (dlab) parts.push(dlab);
  if (glab) parts.push(glab);
  if (parts.length === 0) return "Categoría";
  return parts.join(" ");
}

/** Nombre visible de la categoría (manual o automático). */
export function displayCategoryName(
  category: CategoryMock,
  divisions: { id: string; label: string }[],
): string {
  if (category.categoryTitleManual && category.label.trim()) {
    return category.label.trim();
  }
  return buildDefaultCategoryLabel(
    category.ageLabel,
    category.divisionId,
    divisions,
    category.gender,
  );
}

const DEFAULT_DIVISION_ID = "div-general";

function inferAgeLabelFromCategoryLabel(catLabel: string): string {
  const s = catLabel.trim();
  const num = s.match(/^(\d+U)\b/i);
  if (num) return num[1].toUpperCase();
  if (/^open\b/i.test(s)) return "Open";
  return "";
}

/** Texto para inscripciones: edad · división · género · (título manual) · subdivisión. */
export function formatRegistrationDivisionLabel(
  tournament: TournamentMock,
  category: CategoryMock,
  subdivisionId: string | null,
): string {
  const divs = Array.isArray(tournament.divisions) ? tournament.divisions : [];
  const div = divs.find((d) => d.id === category.divisionId);
  const divLabel = div?.label?.trim() ?? "";
  const age = category.ageLabel.trim();
  const genderWord = categoryGenderLabel(category.gender);
  const parts: string[] = [];
  if (age) parts.push(age);
  if (divLabel) parts.push(divLabel);
  if (genderWord) parts.push(genderWord);
  if (category.categoryTitleManual && category.label.trim()) {
    parts.push(category.label.trim());
  }
  let s = parts.join(" · ") || category.label.trim() || "—";
  if (subdivisionId) {
    const sub = category.subdivisions.find((x) => x.id === subdivisionId);
    if (sub) s = `${s} · ${sub.label}`;
  }
  return s;
}

/** Construye `venues`, `divisions` y categorías coherentes (migración desde datos viejos). */
export function normalizeTournament(t: TournamentMock): TournamentMock {
  const legacy = t as unknown as {
    locations?: string[];
    courtCount?: number | null;
    venues?: TournamentVenue[];
    divisions?: TournamentDivisionMock[];
  };

  let venues: TournamentVenue[] = [];
  if (Array.isArray(legacy.venues) && legacy.venues.length > 0) {
    venues = legacy.venues.map((v) => ({
      label: String(v.label ?? "").trim(),
      courtCount:
        v.courtCount === undefined || v.courtCount === null
          ? null
          : typeof v.courtCount === "number"
            ? v.courtCount
            : null,
    }));
  } else if (Array.isArray(legacy.locations) && legacy.locations.length > 0) {
    const cc = legacy.courtCount ?? null;
    venues = legacy.locations.map((label, i) => ({
      label: String(label).trim(),
      courtCount: i === 0 ? cc : null,
    }));
  } else {
    const lb = t.locationLabel.trim() || "Por definir";
    venues = [{ label: lb, courtCount: legacy.courtCount ?? null }];
  }

  venues = venues.filter((v) => v.label.length > 0);
  if (venues.length === 0) {
    venues = [{ label: t.locationLabel.trim() || "Por definir", courtCount: null }];
  }

  let divisions: TournamentDivisionMock[] = [];
  if (Array.isArray(legacy.divisions) && legacy.divisions.length > 0) {
    divisions = legacy.divisions
      .filter(
        (d) =>
          d &&
          typeof d === "object" &&
          typeof (d as TournamentDivisionMock).id === "string" &&
          typeof (d as TournamentDivisionMock).label === "string",
      )
      .map((d) => {
        const x = d as TournamentDivisionMock;
        return { id: String(x.id).trim(), label: String(x.label).trim() };
      })
      .filter((d) => d.id.length > 0 && d.label.length > 0);
  }
  if (divisions.length === 0) {
    divisions = [{ id: DEFAULT_DIVISION_ID, label: "General" }];
  }

  const divIds = new Set(divisions.map((d) => d.id));
  const defaultDivId = divisions[0]!.id;

  const categories = (t.categories ?? []).map((c) => {
    const cx = c as unknown as {
      ageLabel?: unknown;
      divisionId?: unknown;
      categoryTitleManual?: unknown;
      gender?: unknown;
    };
    let ageLabel = typeof cx.ageLabel === "string" ? cx.ageLabel.trim() : "";
    let divisionId = typeof cx.divisionId === "string" ? cx.divisionId.trim() : "";
    if (!divIds.has(divisionId)) divisionId = defaultDivId;
    if (!ageLabel) {
      const inferred = inferAgeLabelFromCategoryLabel(c.label);
      if (inferred) ageLabel = inferred;
    }
    const categoryTitleManual =
      typeof cx.categoryTitleManual === "boolean" ? cx.categoryTitleManual : false;
    let gender = parseCategoryGender(cx.gender);
    if (cx.gender === undefined || cx.gender === null) {
      const divRow = divisions.find((x) => x.id === divisionId);
      const inferredG = divRow ? inferGenderFromDivisionLabel(divRow.label) : null;
      if (inferredG) gender = inferredG;
    }
    return { ...c, ageLabel, divisionId, categoryTitleManual, gender };
  });

  const label = venues.map((v) => v.label).join(" · ");
  const merged = {
    ...t,
    venues,
    locationLabel: label,
    divisions,
    categories,
  } as Record<string, unknown>;
  delete merged.locations;
  delete merged.courtCount;
  return merged as TournamentMock;
}

export function getTournamentBySlug(slug: string): TournamentMock | undefined {
  const raw = tournaments.find((t) => t.slug === slug);
  return raw ? normalizeTournament(raw) : undefined;
}

export function getRegistrationsByTournamentSlug(
  slug: string,
): RegistrationRowMock[] {
  return registrationRows.filter((r) => r.tournamentSlug === slug);
}
