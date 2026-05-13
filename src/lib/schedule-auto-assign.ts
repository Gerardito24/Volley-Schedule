import type {
  CategoryScheduleMock,
  ScheduleAssignmentMock,
  SchedulePhaseMock,
} from "@/lib/schedule-types";
import {
  courtRefsById,
  resolveCourtIdFromAssignment,
  type CourtRef,
} from "@/lib/tournament-courts";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM-DD` del calendario local. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Medianoche local del día ISO `YYYY-MM-DD`. */
export function localMidnight(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map((x) => Number.parseInt(x, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Primer instante tras el último día del torneo (límite exclusivo para intervalos [start,end)). */
export function tournamentExclusiveEnd(endsOn: string): Date {
  const d = localMidnight(endsOn);
  d.setDate(d.getDate() + 1);
  return d;
}

export function parseDurationToMinutes(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) {
    const n = Number.parseInt(t, 10);
    return n > 0 ? n : null;
  }
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number.parseInt(m[1]!, 10);
  const min = Number.parseInt(m[2]!, 10);
  if (min >= 60 || h > 48) return null;
  const total = h * 60 + min;
  return total > 0 ? total : null;
}

/** Parsea datetime local tipo `YYYY-MM-DDTHH:mm` o con segundos. */
export function parseFlexibleLocalDatetime(s: string): Date | null {
  const trimmed = s.trim();
  const m = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return null;
  const y = Number.parseInt(m[1]!, 10);
  const mo = Number.parseInt(m[2]!, 10);
  const d = Number.parseInt(m[3]!, 10);
  const h = Number.parseInt(m[4]!, 10);
  const mi = Number.parseInt(m[5]!, 10);
  const sec = m[6] ? Number.parseInt(m[6]!, 10) : 0;
  if ([y, mo, d, h, mi, sec].some((x) => Number.isNaN(x))) return null;
  return new Date(y, mo - 1, d, h, mi, sec, 0);
}

export function formatDatetimeLocalSeconds(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

/** Primer partido debe caer en un día entre startsOn y endsOn (inclusive). */
export function isFirstStartDateInTournamentRange(
  firstStart: Date,
  tournamentStartsOn: string,
  tournamentEndsOn: string,
): boolean {
  const key = localDateKey(firstStart);
  return key >= tournamentStartsOn && key <= tournamentEndsOn;
}

export function buildOrderedMatchIds(phases: SchedulePhaseMock[]): string[] {
  const rows: { phaseIdx: number; id: string; round: number; order: number }[] =
    [];
  phases.forEach((ph, phaseIdx) => {
    for (const m of ph.matches) {
      rows.push({
        phaseIdx,
        id: m.id,
        round: m.round,
        order: m.orderInRound,
      });
    }
  });
  rows.sort((a, b) => {
    if (a.phaseIdx !== b.phaseIdx) return a.phaseIdx - b.phaseIdx;
    if (a.round !== b.round) return a.round - b.round;
    return a.order - b.order;
  });
  return rows.map((r) => r.id);
}

export function assignSlotsGreedy(input: {
  phases: SchedulePhaseMock[];
  firstStart: Date;
  durationMinutes: number;
  courtCount: number;
  tournamentStartsOn: string;
  tournamentEndsOn: string;
}):
  | { ok: true; assignments: Record<string, ScheduleAssignmentMock> }
  | { ok: false; error: string } {
  const {
    phases,
    firstStart,
    durationMinutes,
    courtCount,
    tournamentStartsOn,
    tournamentEndsOn,
  } = input;

  if (!Number.isInteger(courtCount) || courtCount < 1) {
    return { ok: false, error: "Número de canchas inválido." };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, error: "Duración por juego inválida." };
  }

  if (
    !isFirstStartDateInTournamentRange(
      firstStart,
      tournamentStartsOn,
      tournamentEndsOn,
    )
  ) {
    return {
      ok: false,
      error:
        "La fecha y hora del primer partido deben caer en un día entre el inicio y el fin del torneo.",
    };
  }

  const winStart = localMidnight(tournamentStartsOn);
  const winEndExcl = tournamentExclusiveEnd(tournamentEndsOn);
  if (firstStart < winStart) {
    return { ok: false, error: "El primer partido es anterior al inicio del torneo." };
  }

  const matchIds = buildOrderedMatchIds(phases);
  const nextAvailable: Date[] = Array.from(
    { length: courtCount },
    () => new Date(firstStart.getTime()),
  );

  const assignments: Record<string, ScheduleAssignmentMock> = {};
  const durationMs = durationMinutes * 60_000;

  for (const matchId of matchIds) {
    let bestIdx = 0;
    let bestT = nextAvailable[0]!.getTime();
    for (let i = 1; i < courtCount; i++) {
      const t = nextAvailable[i]!.getTime();
      if (t < bestT) {
        bestT = t;
        bestIdx = i;
      }
    }

    const start = new Date(bestT);
    const end = new Date(bestT + durationMs);

    if (start < winStart || end > winEndExcl) {
      return {
        ok: false,
        error:
          "No caben todos los partidos dentro de las fechas del torneo con la duración y canchas indicadas. Ajusta horario inicial, duración, más canchas o acorta el torneo.",
      };
    }

    assignments[matchId] = {
      startsAt: formatDatetimeLocalSeconds(start),
      courtLabel: `Cancha ${bestIdx + 1}`,
    };
    nextAvailable[bestIdx] = end;
  }

  return { ok: true, assignments };
}

/** Intervalo ocupado en una cancha global (p. ej. otra categoría). */
export type OccupancyBlock = {
  courtId: string;
  startMs: number;
  endMs: number;
};

/**
 * Primer instante `>= fromMs` donde cabe `[t, t + durationMs)` sin solapar bloques
 * de esa cancha y dentro de `[winStartMs, winEndExclMs)`.
 */
export function earliestFreeSlot(input: {
  fromMs: number;
  durationMs: number;
  courtId: string;
  blocks: OccupancyBlock[];
  winStartMs: number;
  winEndExclMs: number;
}): number | null {
  const { durationMs, courtId, winEndExclMs, blocks, winStartMs } = input;
  let t = Math.max(input.fromMs, winStartMs);
  const relevant = blocks
    .filter((b) => b.courtId === courtId)
    .sort((a, b) => a.startMs - b.startMs);

  for (let guard = 0; guard < 5000; guard++) {
    if (t + durationMs > winEndExclMs) return null;
    let bumped = false;
    for (const b of relevant) {
      if (intervalsOverlap(t, t + durationMs, b.startMs, b.endMs)) {
        t = Math.max(t, b.endMs);
        bumped = true;
      }
    }
    if (!bumped) return t;
  }
  return null;
}

export function buildOccupancyFromSchedules(
  categorySchedules: CategoryScheduleMock[],
  courts: CourtRef[],
  excludeCategoryId: string | null,
): OccupancyBlock[] {
  const out: OccupancyBlock[] = [];
  for (const cat of categorySchedules) {
    if (excludeCategoryId != null && cat.categoryId === excludeCategoryId) {
      continue;
    }
    const dur = cat.schedulingMeta?.durationMinutes;
    if (dur == null || dur <= 0) continue;
    const ordered = buildOrderedMatchIds(cat.phases);
    for (const mid of ordered) {
      const as = cat.assignments[mid];
      if (!as?.startsAt) continue;
      const cid = resolveCourtIdFromAssignment(as, courts);
      if (!cid) continue;
      const st = parseFlexibleLocalDatetime(as.startsAt);
      if (!st || Number.isNaN(st.getTime())) continue;
      out.push({
        courtId: cid,
        startMs: st.getTime(),
        endMs: st.getTime() + dur * 60_000,
      });
    }
  }
  return out;
}

/**
 * Asignación voraz con canchas globales (`allowedCourtIds`) y ocupación previa
 * (otras categorías). Cada partido guarda `courtId` + `courtLabel` legible.
 */
export function assignSlotsGreedyShared(input: {
  phases: SchedulePhaseMock[];
  firstStart: Date;
  durationMinutes: number;
  allowedCourtIds: string[];
  courts: CourtRef[];
  existingOccupancy: OccupancyBlock[];
  tournamentStartsOn: string;
  tournamentEndsOn: string;
}):
  | { ok: true; assignments: Record<string, ScheduleAssignmentMock> }
  | { ok: false; error: string } {
  const {
    phases,
    firstStart,
    durationMinutes,
    allowedCourtIds,
    courts,
    existingOccupancy,
    tournamentStartsOn,
    tournamentEndsOn,
  } = input;

  const courtCount = allowedCourtIds.length;
  if (!Number.isInteger(courtCount) || courtCount < 1) {
    return { ok: false, error: "Tenés que elegir al menos una cancha." };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, error: "Duración por juego inválida." };
  }

  const idSet = courtRefsById(courts);
  for (const id of allowedCourtIds) {
    if (!idSet.has(id)) {
      return {
        ok: false,
        error:
          "Una de las canchas elegidas no existe en las sedes del torneo. Revisá ubicaciones y canchas.",
      };
    }
  }

  if (
    !isFirstStartDateInTournamentRange(
      firstStart,
      tournamentStartsOn,
      tournamentEndsOn,
    )
  ) {
    return {
      ok: false,
      error:
        "La fecha y hora del primer partido deben caer en un día entre el inicio y el fin del torneo.",
    };
  }

  const winStart = localMidnight(tournamentStartsOn);
  const winEndExcl = tournamentExclusiveEnd(tournamentEndsOn);
  const winStartMs = winStart.getTime();
  const winEndExclMs = winEndExcl.getTime();
  if (firstStart < winStart) {
    return { ok: false, error: "El primer partido es anterior al inicio del torneo." };
  }

  const matchIds = buildOrderedMatchIds(phases);
  const durationMs = durationMinutes * 60_000;
  const mergedBlocks: OccupancyBlock[] = [...existingOccupancy];

  const nextAvailable: number[] = [];
  for (let i = 0; i < courtCount; i++) {
    const courtId = allowedCourtIds[i]!;
    const slot = earliestFreeSlot({
      fromMs: firstStart.getTime(),
      durationMs,
      courtId,
      blocks: mergedBlocks,
      winStartMs,
      winEndExclMs,
    });
    if (slot == null) {
      return {
        ok: false,
        error:
          "Con las canchas elegidas y el horario de otras categorías, no hay hueco para el primer partido. Cambiá la hora inicial, las canchas, la duración u otras categorías.",
      };
    }
    nextAvailable.push(slot);
  }

  const assignments: Record<string, ScheduleAssignmentMock> = {};

  for (const matchId of matchIds) {
    let bestIdx = 0;
    let bestT = nextAvailable[0]!;
    for (let i = 1; i < courtCount; i++) {
      const t = nextAvailable[i]!;
      if (t < bestT) {
        bestT = t;
        bestIdx = i;
      }
    }

    const courtId = allowedCourtIds[bestIdx]!;
    const startMs = earliestFreeSlot({
      fromMs: bestT,
      durationMs,
      courtId,
      blocks: mergedBlocks,
      winStartMs,
      winEndExclMs,
    });
    if (startMs == null) {
      return {
        ok: false,
        error:
          "No caben todos los partidos: choca con otras categorías o con el calendario del torneo. Ajustá horarios, canchas o duración.",
      };
    }
    const endMs = startMs + durationMs;
    if (startMs < winStartMs || endMs > winEndExclMs) {
      return {
        ok: false,
        error:
          "No caben todos los partidos dentro de las fechas del torneo con la duración y canchas indicadas. Ajusta horario inicial, duración, más canchas o acorta el torneo.",
      };
    }

    const ref = idSet.get(courtId);
    assignments[matchId] = {
      startsAt: formatDatetimeLocalSeconds(new Date(startMs)),
      courtLabel: ref?.label ?? courtId,
      courtId,
    };
    mergedBlocks.push({ courtId, startMs, endMs });

    const nextSlot = earliestFreeSlot({
      fromMs: endMs,
      durationMs,
      courtId,
      blocks: mergedBlocks,
      winStartMs,
      winEndExclMs,
    });
    nextAvailable[bestIdx] = nextSlot ?? Number.POSITIVE_INFINITY;
  }

  return { ok: true, assignments };
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Devuelve mensaje de error si el partido `matchId` solapa otro en la misma cancha
 * (misma duración fija `durationMinutes`).
 */
export function findAssignmentConflict(
  assignments: Record<string, ScheduleAssignmentMock>,
  orderedMatchIds: string[],
  durationMinutes: number,
  matchId: string,
): string | null {
  const self = assignments[matchId];
  if (!self?.startsAt || !self.courtLabel) return null;

  const selfStart = parseFlexibleLocalDatetime(self.startsAt);
  if (!selfStart || Number.isNaN(selfStart.getTime())) {
    return "Hora de juego inválida.";
  }
  const selfEnd = selfStart.getTime() + durationMinutes * 60_000;

  for (const otherId of orderedMatchIds) {
    if (otherId === matchId) continue;
    const other = assignments[otherId];
    if (!other?.startsAt || !other.courtLabel) continue;
    if (other.courtLabel !== self.courtLabel) continue;

    const oStart = parseFlexibleLocalDatetime(other.startsAt);
    if (!oStart || Number.isNaN(oStart.getTime())) continue;
    const oEnd = oStart.getTime() + durationMinutes * 60_000;

    if (intervalsOverlap(selfStart.getTime(), selfEnd, oStart.getTime(), oEnd)) {
      return `Conflicto: la ${self.courtLabel} ya tiene un partido en ese horario.`;
    }
  }

  return null;
}

/**
 * Solapes entre categorías y dentro de la misma categoría (duración distinta por categoría).
 */
export function findGlobalAssignmentConflict(input: {
  categorySchedules: CategoryScheduleMock[];
  courts: CourtRef[];
  focusCategoryId: string;
  focusMatchId: string;
  focusAssignments: Record<string, ScheduleAssignmentMock>;
  focusDurationMinutes: number;
}): string | null {
  const {
    categorySchedules,
    courts,
    focusCategoryId,
    focusMatchId,
    focusAssignments,
    focusDurationMinutes,
  } = input;

  const self = focusAssignments[focusMatchId];
  if (!self?.startsAt) return null;

  const selfCourtId = resolveCourtIdFromAssignment(self, courts);
  if (!selfCourtId) {
    return "No se reconoce la cancha. Elegí una cancha de la lista del torneo.";
  }

  const selfStart = parseFlexibleLocalDatetime(self.startsAt);
  if (!selfStart || Number.isNaN(selfStart.getTime())) {
    return "Hora de juego inválida.";
  }
  const selfEnd = selfStart.getTime() + focusDurationMinutes * 60_000;
  const label =
    courts.find((c) => c.id === selfCourtId)?.label ??
    self.courtLabel ??
    "esa cancha";

  for (const cat of categorySchedules) {
    const dur = cat.schedulingMeta?.durationMinutes;
    if (dur == null || dur <= 0) continue;

    const assignMap =
      cat.categoryId === focusCategoryId ? focusAssignments : cat.assignments;
    const ordered = buildOrderedMatchIds(cat.phases);

    for (const otherId of ordered) {
      if (cat.categoryId === focusCategoryId && otherId === focusMatchId) {
        continue;
      }

      const other = assignMap[otherId];
      if (!other?.startsAt) continue;
      const otherCourtId = resolveCourtIdFromAssignment(other, courts);
      if (!otherCourtId || otherCourtId !== selfCourtId) continue;

      const oStart = parseFlexibleLocalDatetime(other.startsAt);
      if (!oStart || Number.isNaN(oStart.getTime())) continue;
      const oEnd = oStart.getTime() + dur * 60_000;

      if (intervalsOverlap(selfStart.getTime(), selfEnd, oStart.getTime(), oEnd)) {
        const scope =
          cat.categoryId === focusCategoryId ? "en esta categoría" : "en otra categoría";
        return `Conflicto: ${label} ya tiene un partido en ese horario (${scope}).`;
      }
    }
  }

  return null;
}

/** Comprueba que la fecha/hora cae dentro del rango de días del torneo y el intervalo [start,end) cabe. */
export function validateAssignmentWindow(
  startsAt: string,
  durationMinutes: number,
  tournamentStartsOn: string,
  tournamentEndsOn: string,
): string | null {
  const start = parseFlexibleLocalDatetime(startsAt);
  if (!start || Number.isNaN(start.getTime())) {
    return "Hora de juego inválida.";
  }
  if (
    !isFirstStartDateInTournamentRange(
      start,
      tournamentStartsOn,
      tournamentEndsOn,
    )
  ) {
    return "La fecha debe estar entre el inicio y el fin del torneo.";
  }
  const winStart = localMidnight(tournamentStartsOn);
  const winEndExcl = tournamentExclusiveEnd(tournamentEndsOn);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  if (start < winStart || end > winEndExcl) {
    return "Ese horario hace que el partido termine fuera de las fechas del torneo.";
  }
  return null;
}
