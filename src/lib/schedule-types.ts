/**
 * Modelo de itinerario / brackets persistido en el torneo (mock + localStorage).
 * Los generadores producen fases con referencias (seed, winner de otro partido, poolStanding).
 */

export type MatchSideRef =
  | { type: "seed"; seedIndex: number }
  | { type: "winner"; matchId: string }
  | { type: "loser"; matchId: string }
  | { type: "poolStanding"; poolId: string; place: number }
  | { type: "bye" };

export type ScheduleMatchResultMock = {
  home: number;
  away: number;
  /** ISO 8601 */
  recordedAt: string;
};

export type ScheduleMatchMock = {
  id: string;
  phaseId: string;
  round: number;
  orderInRound: number;
  home: MatchSideRef;
  away: MatchSideRef;
  /** Marcador registrado en vivo (MVP: solo fases bracket / single_elim). */
  result?: ScheduleMatchResultMock;
};

export type SchedulePoolMock = {
  id: string;
  label: string;
  /** Índices de seed (1-based) asignados a esta pool, en orden de lista del usuario. */
  seedIndices: number[];
};

export type SchedulePhaseKind =
  | "pool_play"
  | "single_elim"
  | "round_robin";

export type SchedulePhaseMock = {
  id: string;
  kind: SchedulePhaseKind;
  /** Identificador de plantilla usada al generar (ej. single_elim, pools_to_bracket). */
  templateId: string;
  /** Parámetros de la plantilla (recuentos, pools, etc.). */
  config: Record<string, unknown>;
  pools: SchedulePoolMock[];
  matches: ScheduleMatchMock[];
};

export type ScheduleAssignmentMock = {
  /** ISO local datetime string o fecha + hora acordada para el UI (datetime-local). */
  startsAt?: string;
  courtLabel?: string;
};

/** Metadatos para validar solapes al editar hora/cancha manualmente. */
export type CategorySchedulingMetaMock = {
  durationMinutes: number;
  courtCount: number;
};

export type CategoryScheduleMock = {
  categoryId: string;
  /** Nombres en orden de seed: índice i = seed i+1. */
  teamLabels: string[];
  phases: SchedulePhaseMock[];
  assignments: Record<string, ScheduleAssignmentMock>;
  schedulingMeta?: CategorySchedulingMetaMock | null;
};

export type TournamentScheduleMock = {
  published: boolean;
  categorySchedules: CategoryScheduleMock[];
};
