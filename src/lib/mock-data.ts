import type { TournamentScheduleMock } from "@/lib/schedule-types";

export type { TournamentScheduleMock } from "@/lib/schedule-types";

export type SubdivisionMock = {
  id: string;
  label: string;
  /** Cupo por subdivisión; null si el cupo vive solo a nivel categoría. */
  maxTeams: number | null;
};

/** División global del torneo (ej. Oro, Femenino). Las categorías referencian `divisionId`. */
export type TournamentDivisionMock = {
  id: string;
  label: string;
};

export type CategoryMock = {
  id: string;
  /** Nombre mostrado / en listados; por defecto deriva de edad + división si `categoryTitleManual` es false. */
  label: string;
  /** Solo edad o bracket (ej. 14U); el grupo es la división del torneo. */
  ageLabel: string;
  /** Una de `TournamentMock.divisions`. */
  divisionId: string;
  /** Si true, `label` fue fijado a mano (doble clic) y no se recalcula al cambiar edad/división. */
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
    venues: [{ label: "Puerto Rico", courtCount: null }],
    registrationDeadlineOn: "2026-06-08",
    tournamentStartsOn: "2026-06-15",
    tournamentEndsOn: "2026-06-17",
    registrationFeeCents: null,
    publicEntryFeeCents: 600,
    promoImageDataUrl: null,
    status: "open",
    divisions: [
      { id: "div-c30-fem", label: "Femenino" },
      { id: "div-c30-masc", label: "Masculino" },
      { id: "div-c30-open", label: "Open" },
    ],
    categories: [
      {
        id: "d1",
        label: "14U Femenino",
        ageLabel: "14U",
        divisionId: "div-c30-fem",
        feeCents: 25000,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "d2",
        label: "16U Masculino",
        ageLabel: "16U",
        divisionId: "div-c30-masc",
        feeCents: 27500,
        maxTeams: 16,
        subdivisions: [],
      },
      {
        id: "d3",
        label: "Open Coed",
        ageLabel: "Open",
        divisionId: "div-c30-open",
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
        label: "12U · Premier",
        ageLabel: "12U",
        divisionId: "div-p5c-main",
        feeCents: 20000,
        maxTeams: 10,
        subdivisions: [],
      },
      {
        id: "d5",
        label: "18U · Premier",
        ageLabel: "18U",
        divisionId: "div-p5c-main",
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
    divisionLabel: "16U · Masculino",
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
    divisionLabel: "14U · Femenino",
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
    divisionLabel: "14U · Femenino",
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
    divisionLabel: "18U · Premier",
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

/** Título por defecto: `edad · nombre división` (la división del torneo es el grupo). */
export function buildDefaultCategoryLabel(
  ageLabel: string,
  divisionId: string,
  divisions: { id: string; label: string }[],
): string {
  const age = ageLabel.trim();
  const d = divisions.find((x) => x.id === divisionId);
  const dlab = (d?.label ?? "").trim();
  if (age && dlab) return `${age} · ${dlab}`;
  if (age) return age;
  if (dlab) return dlab;
  return "Categoría";
}

/** Nombre visible de la categoría (manual o automático). */
export function displayCategoryName(
  category: CategoryMock,
  divisions: { id: string; label: string }[],
): string {
  if (category.categoryTitleManual && category.label.trim()) {
    return category.label.trim();
  }
  return buildDefaultCategoryLabel(category.ageLabel, category.divisionId, divisions);
}

const DEFAULT_DIVISION_ID = "div-general";

function inferAgeLabelFromCategoryLabel(catLabel: string): string {
  const s = catLabel.trim();
  const num = s.match(/^(\d+U)\b/i);
  if (num) return num[1].toUpperCase();
  if (/^open\b/i.test(s)) return "Open";
  return "";
}

/** Texto para inscripciones: edad · división del torneo · nombre categoría · subdivisión. */
export function formatRegistrationDivisionLabel(
  tournament: TournamentMock,
  category: CategoryMock,
  subdivisionId: string | null,
): string {
  const divs = Array.isArray(tournament.divisions) ? tournament.divisions : [];
  const div = divs.find((d) => d.id === category.divisionId);
  const divLabel = div?.label?.trim() ?? "";
  const age = category.ageLabel.trim();
  const parts: string[] = [];
  if (age) parts.push(age);
  if (divLabel) parts.push(divLabel);
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
    return { ...c, ageLabel, divisionId, categoryTitleManual };
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
