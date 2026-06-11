// Modelo de datos de VolleyV2 — una sola fuente de verdad (JSON en /data).

export type TournamentStatus = "draft" | "open" | "closed";
export type Gender = "femenino" | "masculino" | "mixto";

export interface Venue {
  id: string;
  label: string;
  courtCount: number;
}

export interface Division {
  id: string;
  label: string;
}

export interface Category {
  id: string;
  ageLabel: string; // "14U"
  divisionId: string;
  gender: Gender;
  /** Si es null hereda la tarifa base del torneo */
  feeCents: number | null;
  maxTeams: number | null;
  /** Título manual opcional; si no, se deriva "14U Open Femenino" */
  customLabel?: string;
}

export interface Tournament {
  slug: string;
  name: string;
  description: string;
  venues: Venue[];
  registrationDeadlineOn: string; // YYYY-MM-DD
  startsOn: string;
  endsOn: string;
  baseFeeCents: number | null;
  publicEntryFeeCents: number | null;
  promoImageDataUrl?: string | null;
  status: TournamentStatus;
  divisions: Division[];
  categories: Category[];
  schedule: TournamentSchedule | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Inscripciones
// ---------------------------------------------------------------------------

/** @deprecated Estado combinado del modelo viejo; se conserva para migrar filas existentes. */
export type RegistrationStatus =
  | "pending_payment"
  | "paid"
  | "under_review"
  | "approved"
  | "rejected"
  | "waitlisted";

/** Decisión deportiva: ¿el equipo puede jugar? */
export type ApprovalStatus = "pending" | "approved" | "rejected" | "waitlisted";

/** Estado del pago, independiente de la aprobación. */
export type PaymentStatus = "unpaid" | "paid";

export interface Representative {
  name: string;
  email: string;
  phone: string;
}

export interface Coach {
  name: string;
  phone: string;
  email?: string;
  affiliationNumber?: string;
  level?: string; // Nacional I, Nacional II, Regional, Instructor, Auxiliar
}

export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  birthDate: string; // YYYY-MM-DD
  affiliationNumber?: string;
}

export interface Registration {
  id: string;
  tournamentSlug: string;
  categoryId: string;
  clubSlug: string;
  clubName: string;
  teamName: string;
  representative: Representative;
  coach: Coach;
  assistant?: Coach | null;
  players: Player[];
  comments?: string;
  signatureName: string;
  termsAccepted: boolean;
  /** Decisión deportiva (aprobado para jugar, en revisión, etc.) */
  approval: ApprovalStatus;
  /** Estado del pago, separado de la aprobación */
  paymentStatus: PaymentStatus;
  /** Cuándo se marcó como pagado */
  paidAt?: string;
  /** @deprecated Campo del modelo viejo; las filas nuevas no lo usan. */
  status?: RegistrationStatus;
  feeCents: number;
  registeredAt: string; // ISO — orden de siembra del bracket
  updatedAt: string;
  /** ID del cliente que realizó la inscripción (undefined = anónima) */
  clientId?: string;
}

// ---------------------------------------------------------------------------
// Clubes y rosters guardados (reutilización entre torneos)
// ---------------------------------------------------------------------------

export interface ClubProfile {
  clubSlug: string;
  displayName: string;
  pueblo: string;
  phone?: string;
  contactName: string;
  contactEmail: string;
  updatedAt: string;
}

export interface RosterPlayer {
  id: string;
  name: string;
  jerseyNumber?: string;
  position?: string;
}

export interface TeamRoster {
  id: string;
  registrationId: string;
  clubSlug: string;
  clubName: string;
  teamName: string;
  tournamentSlug: string;
  categoryId: string;
  coachName: string;
  coachPhone: string;
  players: RosterPlayer[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Itinerario / brackets
// ---------------------------------------------------------------------------

export type ScheduleTemplate = "single_elim" | "pools_bracket";

export type MatchSide =
  | { type: "seed"; seed: number } // índice en teams[]
  | { type: "winner"; matchId: string }
  | { type: "loser"; matchId: string }
  | { type: "pool"; poolId: string; rank: number } // rank 1 = primero del pool
  | { type: "bye" };

export interface MatchResult {
  home: number;
  away: number;
  recordedAt: string;
}

export interface Match {
  id: string;
  /** "Pool A", "Cuartos", "Semifinal", "Final" */
  phaseLabel: string;
  /** Orden global para asignación de horarios */
  order: number;
  /** Ronda dentro de su fase (1-based) */
  round: number;
  poolId?: string;
  home: MatchSide;
  away: MatchSide;
  startsAt?: string; // ISO
  court?: string;
  result?: MatchResult | null;
}

export interface ScheduleTeam {
  seed: number;
  label: string;
  registrationId?: string;
}

export interface Pool {
  id: string;
  label: string; // "Pool A"
  teamSeeds: number[];
}

export interface CategoryScheduleSettings {
  template: ScheduleTemplate;
  startAt: string; // ISO del primer partido
  durationMinutes: number;
  courts: string[]; // etiquetas de cancha permitidas
  poolCount?: number;
  advancePerPool?: number;
}

export interface CategorySchedule {
  categoryId: string;
  teams: ScheduleTeam[];
  pools: Pool[];
  matches: Match[];
  settings: CategoryScheduleSettings;
}

export interface TournamentSchedule {
  published: boolean;
  categories: CategorySchedule[];
}

// ---------------------------------------------------------------------------
// Clientes (cuentas públicas)
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminRole = "it_master" | "administrator";

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  position: string;
  passwordHash: string; // sha256 hex
  role: AdminRole;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers de presentación compartidos
// ---------------------------------------------------------------------------

export const COACH_LEVELS = [
  "Nacional I",
  "Nacional II",
  "Regional",
  "Instructor",
  "Auxiliar",
] as const;

export const GENDER_LABELS: Record<Gender, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  mixto: "Mixto",
};

/** @deprecated Etiquetas del modelo viejo de estado combinado. */
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  under_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  waitlisted: "Lista de espera",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  waitlisted: "Lista de espera",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Debe",
  paid: "Pagado",
};

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Borrador",
  open: "Inscripciones abiertas",
  closed: "Cerrado",
};

/**
 * Migra una inscripción del modelo viejo (status combinado) al nuevo
 * (approval + paymentStatus). Las filas nuevas pasan sin cambios.
 */
export function normalizeRegistration(r: Registration): Registration {
  if (r.approval && r.paymentStatus) return r;
  const legacy = r.status ?? "pending_payment";
  const approval: ApprovalStatus =
    legacy === "approved"
      ? "approved"
      : legacy === "rejected"
        ? "rejected"
        : legacy === "waitlisted"
          ? "waitlisted"
          : "pending";
  const paymentStatus: PaymentStatus =
    legacy === "paid" || legacy === "approved" ? "paid" : "unpaid";
  return { ...r, approval, paymentStatus };
}

/** Un equipo entra al bracket si está aprobado, o si ya pagó y sigue en revisión. */
export function isBracketEligible(r: Registration): boolean {
  return (
    r.approval === "approved" || (r.approval === "pending" && r.paymentStatus === "paid")
  );
}

export function categoryLabel(tournament: Tournament, category: Category): string {
  if (category.customLabel?.trim()) return category.customLabel.trim();
  const division = tournament.divisions.find((d) => d.id === category.divisionId);
  return [category.ageLabel, division?.label, GENDER_LABELS[category.gender]]
    .filter(Boolean)
    .join(" ");
}

export function effectiveFeeCents(tournament: Tournament, category: Category): number {
  return category.feeCents ?? tournament.baseFeeCents ?? 0;
}

export function formatUsd(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDateEs(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("es-PR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateRangeEs(start: string, end: string): string {
  if (start === end) return formatDateEs(start);
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  if (ys === ye && ms === me) {
    const month = new Date(Date.UTC(ys, ms - 1, ds)).toLocaleDateString("es-PR", {
      month: "short",
      timeZone: "UTC",
    });
    return `${ds}–${de} ${month} ${ys}`;
  }
  return `${formatDateEs(start)} – ${formatDateEs(end)}`;
}

/** Ventana "activo": desde el día antes del inicio hasta el fin */
export function isTournamentLive(t: Tournament, now = new Date()): boolean {
  const start = new Date(`${t.startsOn}T00:00:00`);
  start.setDate(start.getDate() - 1);
  const end = new Date(`${t.endsOn}T23:59:59`);
  return now >= start && now <= end;
}
