"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryMock, RegistrationRowMock, TournamentMock } from "@/lib/mock-data";
import {
  displayCategoryName,
  registrationRows as seedRegistrationRows,
  tournaments as seedTournaments,
} from "@/lib/mock-data";
import { registrationMatchesAdminCategory } from "@/lib/registration-category-match";
import {
  LOCAL_REGISTRATIONS_KEY,
  readStoredRegistrations,
} from "@/lib/local-registrations";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { upsertStoredTournament } from "@/lib/local-tournaments";
import { buildMatchOrderIndex, formatMatchSide } from "@/lib/schedule-display";
import type {
  CategoryScheduleMock,
  ScheduleAssignmentMock,
  SchedulePhaseMock,
  TournamentScheduleMock,
} from "@/lib/schedule-types";
import {
  assignSlotsGreedy,
  buildOrderedMatchIds,
  findAssignmentConflict,
  isFirstStartDateInTournamentRange,
  parseDurationToMinutes,
  parseFlexibleLocalDatetime,
  validateAssignmentWindow,
} from "@/lib/schedule-auto-assign";
import { SCHEDULE_TEMPLATE_OPTIONS } from "@/lib/schedule-templates";
import { generatePoolsToBracketPhases } from "@/lib/schedule-templates/generate-pools-bracket";
import { generateSingleEliminationPhase } from "@/lib/schedule-templates/generate-single-elim";

type Props = {
  tournament: TournamentMock;
  onScheduleSaved: () => void;
};

type SeedSlot =
  | { kind: "registration"; registrationId: string }
  | { kind: "manual"; label: string };

function parseTeamLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function phaseTitle(ph: SchedulePhaseMock): string {
  if (ph.templateId === "pools_round_robin") return "Round robin (pools)";
  if (ph.templateId === "pools_to_bracket") return "Bracket eliminatorio";
  if (ph.templateId === "single_elim") return "Eliminación simple";
  return ph.templateId;
}

function isEligibleSeedRow(r: RegistrationRowMock): boolean {
  return r.status === "paid" || r.status === "approved";
}

function normalizeDatetimeLocalSeconds(raw: string): string {
  const t = raw.trim();
  if (t.length === 16 && t.includes("T")) return `${t}:00`;
  return t;
}

function matchesSubdivisionFilter(
  row: RegistrationRowMock,
  category: CategoryMock | undefined,
  subdivisionFilter: string | "all",
): boolean {
  if (!category) return false;
  if (category.subdivisions.length === 0) return true;
  if (subdivisionFilter === "all") return true;
  return row.subdivisionId === subdivisionFilter;
}

export function TournamentSchedulePanel({
  tournament,
  onScheduleSaved,
}: Props) {
  const categories = tournament.categories;
  const seedTournamentForSlug = useMemo(
    () => seedTournaments.find((t) => t.slug === tournament.slug),
    [tournament.slug],
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [subdivisionFilter, setSubdivisionFilter] = useState<string | "all">(
    "all",
  );
  const [templateId, setTemplateId] = useState<
    "single_elim" | "pools_to_bracket"
  >("single_elim");
  const [slotRows, setSlotRows] = useState<SeedSlot[]>([]);
  const [poolCount, setPoolCount] = useState(2);
  const [advancePerPool, setAdvancePerPool] = useState(2);
  const [published, setPublished] = useState(
    tournament.schedule?.published ?? false,
  );
  /** Valor del input datetime-local (sin segundos); sin valor por defecto al cargar. */
  const [firstMatchDatetime, setFirstMatchDatetime] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [courtCountInput, setCourtCountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [listRevision, setListRevision] = useState(0);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const mergedRegistrations = useMemo(
    () =>
      mergeAdminRegistrations(seedRegistrationRows, readStoredRegistrations()),
    [listRevision],
  );

  useEffect(() => {
    const bump = () => setListRevision((x) => x + 1);
    window.addEventListener("volleyschedule-registrations-changed", bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_REGISTRATIONS_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("volleyschedule-registrations-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    setPublished(tournament.schedule?.published ?? false);
  }, [tournament.slug, tournament.schedule?.published]);

  useEffect(() => {
    const eligible = mergedRegistrations.filter(
      (r) =>
        registrationMatchesAdminCategory(
          r,
          tournament,
          categoryId,
          seedTournamentForSlug,
        ) &&
        isEligibleSeedRow(r) &&
        matchesSubdivisionFilter(r, selectedCategory, subdivisionFilter),
    );
    eligible.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
    setSlotRows(
      eligible.map((r) => ({
        kind: "registration",
        registrationId: r.id,
      })),
    );
  }, [
    mergedRegistrations,
    tournament,
    categoryId,
    subdivisionFilter,
    selectedCategory,
    seedTournamentForSlug,
    listRevision,
  ]);

  useEffect(() => {
    setSubdivisionFilter("all");
  }, [categoryId]);

  const regById = useMemo(() => {
    const m = new Map<string, RegistrationRowMock>();
    for (const r of mergedRegistrations) m.set(r.id, r);
    return m;
  }, [mergedRegistrations]);

  const eligibleCount = useMemo(() => {
    return mergedRegistrations.filter(
      (r) =>
        registrationMatchesAdminCategory(
          r,
          tournament,
          categoryId,
          seedTournamentForSlug,
        ) &&
        isEligibleSeedRow(r) &&
        matchesSubdivisionFilter(r, selectedCategory, subdivisionFilter),
    ).length;
  }, [
    mergedRegistrations,
    tournament,
    categoryId,
    selectedCategory,
    subdivisionFilter,
    seedTournamentForSlug,
  ]);

  const existingCatSchedule = useMemo(() => {
    return tournament.schedule?.categorySchedules.find(
      (c) => c.categoryId === categoryId,
    );
  }, [tournament.schedule, categoryId]);

  useEffect(() => {
    setFirstMatchDatetime("");
  }, [categoryId]);

  useEffect(() => {
    const meta = existingCatSchedule?.schedulingMeta;
    if (meta) {
      const h = Math.floor(meta.durationMinutes / 60);
      const m = meta.durationMinutes % 60;
      setDurationInput(`${h}:${String(m).padStart(2, "0")}`);
      setCourtCountInput(String(meta.courtCount));
    } else {
      setDurationInput("");
      setCourtCountInput("");
    }
  }, [categoryId, existingCatSchedule?.schedulingMeta]);

  const scheduleDatetimeMin = `${tournament.tournamentStartsOn}T00:00`;
  const scheduleDatetimeMax = `${tournament.tournamentEndsOn}T23:59`;

  const matchIndexById = useMemo(() => {
    if (!existingCatSchedule) return new Map<string, number>();
    const all = existingCatSchedule.phases.flatMap((p) => p.matches);
    return buildMatchOrderIndex(all);
  }, [existingCatSchedule]);

  const flatRows = useMemo(() => {
    if (!existingCatSchedule) return [];
    const rows: {
      phaseTitle: string;
      phaseIdx: number;
      matchId: string;
      round: number;
      orderInRound: number;
      label: string;
    }[] = [];
    existingCatSchedule.phases.forEach((ph, phaseIdx) => {
      const title = phaseTitle(ph);
      for (const m of ph.matches) {
        const home = formatMatchSide(
          m.home,
          existingCatSchedule.teamLabels,
          matchIndexById,
        );
        const away = formatMatchSide(
          m.away,
          existingCatSchedule.teamLabels,
          matchIndexById,
        );
        rows.push({
          phaseTitle: title,
          phaseIdx,
          matchId: m.id,
          round: m.round,
          orderInRound: m.orderInRound,
          label: `${home} vs ${away}`,
        });
      }
    });
    rows.sort((a, b) => {
      if (a.phaseIdx !== b.phaseIdx) return a.phaseIdx - b.phaseIdx;
      if (a.round !== b.round) return a.round - b.round;
      return a.orderInRound - b.orderInRound;
    });
    return rows;
  }, [existingCatSchedule, matchIndexById]);

  function persistSchedule(next: TournamentScheduleMock) {
    upsertStoredTournament({ ...tournament, schedule: next });
    onScheduleSaved();
  }

  function teamLabelsFromSlots(): string[] {
    return slotRows.map((s) => {
      if (s.kind === "manual") return s.label;
      return regById.get(s.registrationId)?.teamName ?? "(equipo desconocido)";
    });
  }

  function moveSlot(from: number, to: number) {
    setSlotRows((rows) => {
      if (to < 0 || to >= rows.length) return rows;
      const next = [...rows];
      const [item] = next.splice(from, 1);
      if (!item) return rows;
      next.splice(to, 0, item);
      return next;
    });
  }

  function refreshFromRegistrations() {
    if (
      !window.confirm(
        "Se restaurará el orden por fecha de inscripción y se perderán cambios manuales de orden y equipos extra. ¿Continuar?",
      )
    ) {
      return;
    }
    setListRevision((x) => x + 1);
  }

  function appendManualFromTextarea() {
    const lines = parseTeamLines(manualText);
    if (lines.length === 0) return;
    setSlotRows((rows) => [
      ...rows,
      ...lines.map((label) => ({ kind: "manual" as const, label })),
    ]);
    setManualText("");
  }

  function removeSlotAt(index: number) {
    setSlotRows((rows) => rows.filter((_, i) => i !== index));
  }

  function handleGenerate() {
    setError(null);
    const labels = teamLabelsFromSlots();
    if (labels.length < 2) {
      setError(
        "Se necesitan al menos 2 equipos (inscripciones pagadas/aprobadas o líneas manuales).",
      );
      return;
    }

    const firstRaw = firstMatchDatetime.trim();
    if (!firstRaw) {
      setError("Indica la fecha y hora del primer partido.");
      return;
    }
    const firstStart = parseFlexibleLocalDatetime(
      normalizeDatetimeLocalSeconds(firstRaw),
    );
    if (!firstStart || Number.isNaN(firstStart.getTime())) {
      setError("Fecha y hora del primer partido no válidas.");
      return;
    }
    if (
      !isFirstStartDateInTournamentRange(
        firstStart,
        tournament.tournamentStartsOn,
        tournament.tournamentEndsOn,
      )
    ) {
      setError(
        "La fecha del primer partido debe estar entre el inicio y el fin del torneo.",
      );
      return;
    }

    const durationMinutes = parseDurationToMinutes(durationInput);
    if (durationMinutes === null) {
      setError(
        'Duración por juego inválida. Usa formato como 1:30 (horas:minutos) o minutos enteros (ej. 90).',
      );
      return;
    }

    const courtCount = Number.parseInt(courtCountInput.trim(), 10);
    if (!Number.isInteger(courtCount) || courtCount < 1) {
      setError("Indica un número de canchas entero mayor o igual a 1.");
      return;
    }

    try {
      let phases: SchedulePhaseMock[];
      if (templateId === "single_elim") {
        phases = [
          generateSingleEliminationPhase({
            phaseId: `${categoryId}-elim`,
            teamCount: labels.length,
          }),
        ];
      } else {
        if (poolCount < 2) {
          setError("Pools: mínimo 2 grupos.");
          return;
        }
        if (labels.length < poolCount) {
          setError("Tiene que haber al menos un equipo por pool.");
          return;
        }
        const { poolsPhase, bracketPhase } = generatePoolsToBracketPhases({
          categoryKey: categoryId,
          teamCount: labels.length,
          poolCount,
          advancePerPool,
        });
        phases = [poolsPhase, bracketPhase];
      }

      const assigned = assignSlotsGreedy({
        phases,
        firstStart,
        durationMinutes,
        courtCount,
        tournamentStartsOn: tournament.tournamentStartsOn,
        tournamentEndsOn: tournament.tournamentEndsOn,
      });

      if (!assigned.ok) {
        setError(assigned.error);
        return;
      }

      const catSched: CategoryScheduleMock = {
        categoryId,
        teamLabels: labels,
        phases,
        assignments: assigned.assignments,
        schedulingMeta: { durationMinutes, courtCount },
      };

      const others =
        tournament.schedule?.categorySchedules.filter(
          (c) => c.categoryId !== categoryId,
        ) ?? [];
      persistSchedule({
        published,
        categorySchedules: [...others, catSched],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar.");
    }
  }

  function patchAssignment(
    matchId: string,
    patch: Partial<ScheduleAssignmentMock>,
  ) {
    if (!existingCatSchedule) return;
    const prev =
      existingCatSchedule.assignments[matchId] ?? ({} as ScheduleAssignmentMock);
    const merged: ScheduleAssignmentMock = { ...prev, ...patch };
    const nextAssign: Record<string, ScheduleAssignmentMock> = {
      ...existingCatSchedule.assignments,
      [matchId]: merged,
    };

    const meta = existingCatSchedule.schedulingMeta;
    const ordered = buildOrderedMatchIds(existingCatSchedule.phases);

    if (merged.startsAt) {
      const windowErr =
        meta?.durationMinutes != null && meta.durationMinutes > 0
          ? validateAssignmentWindow(
              merged.startsAt,
              meta.durationMinutes,
              tournament.tournamentStartsOn,
              tournament.tournamentEndsOn,
            )
          : (() => {
              const start = parseFlexibleLocalDatetime(merged.startsAt!);
              if (!start || Number.isNaN(start.getTime())) {
                return "Hora de juego inválida.";
              }
              if (
                !isFirstStartDateInTournamentRange(
                  start,
                  tournament.tournamentStartsOn,
                  tournament.tournamentEndsOn,
                )
              ) {
                return "La fecha debe estar entre el inicio y el fin del torneo.";
              }
              return null;
            })();
      if (windowErr) {
        setError(windowErr);
        return;
      }
    }

    if (
      meta &&
      meta.durationMinutes > 0 &&
      merged.startsAt &&
      merged.courtLabel
    ) {
      const conflict = findAssignmentConflict(
        nextAssign,
        ordered,
        meta.durationMinutes,
        matchId,
      );
      if (conflict) {
        setError(conflict);
        return;
      }
    }

    setError(null);
    const nextCat: CategoryScheduleMock = {
      ...existingCatSchedule,
      assignments: nextAssign,
    };
    const others =
      tournament.schedule?.categorySchedules.filter(
        (c) => c.categoryId !== categoryId,
      ) ?? [];
    persistSchedule({
      published,
      categorySchedules: [...others, nextCat],
    });
  }

  function handleTogglePublished(next: boolean) {
    setPublished(next);
    persistSchedule({
      published: next,
      categorySchedules: tournament.schedule?.categorySchedules ?? [],
    });
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Itinerario y brackets
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Inscripciones <strong>pagadas</strong> o <strong>aprobadas</strong>, orden por fecha. Reordená y generá el bracket; todo queda en este navegador.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Categoría
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {displayCategoryName(c, tournament.divisions)}
              </option>
            ))}
          </select>
        </div>

        {selectedCategory && selectedCategory.subdivisions.length > 0 ? (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Subdivisión (filtro)
            </label>
            <select
              value={subdivisionFilter}
              onChange={(e) =>
                setSubdivisionFilter(
                  e.target.value === "all" ? "all" : e.target.value,
                )
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="all">Toda la categoría</option>
              {selectedCategory.subdivisions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div />
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Plantilla
          </label>
          <select
            value={templateId}
            onChange={(e) =>
              setTemplateId(e.target.value as typeof templateId)
            }
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {SCHEDULE_TEMPLATE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            {
              SCHEDULE_TEMPLATE_OPTIONS.find((o) => o.id === templateId)
                ?.description
            }
          </p>
        </div>

        {templateId === "pools_to_bracket" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Pools
              </label>
              <input
                type="number"
                min={2}
                max={16}
                value={poolCount}
                onChange={(e) =>
                  setPoolCount(Number.parseInt(e.target.value, 10) || 2)
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Clasifican por pool
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={advancePerPool}
                onChange={(e) =>
                  setAdvancePerPool(Number.parseInt(e.target.value, 10) || 1)
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Seeds (orden = cabezas 1, 2, 3…)
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refreshFromRegistrations}
              className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Refrescar desde inscripciones
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Elegibles en este filtro: {eligibleCount} (pagadas o aprobadas).
        </p>

        {slotRows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No hay equipos elegibles. Marca inscripciones como pagadas o
            aprobadas, o añade equipos manualmente abajo.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {slotRows.map((slot, idx) => {
              const label =
                slot.kind === "registration"
                  ? (regById.get(slot.registrationId)?.teamName ??
                    "(sin nombre)")
                  : slot.label;
              const tag =
                slot.kind === "registration"
                  ? regById.get(slot.registrationId)?.status === "paid"
                    ? "Pagado"
                    : "Aprobado"
                  : "Manual";
              return (
                <li
                  key={`seed-row-${idx}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                >
                  <span className="w-14 shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-center text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    Seed {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-zinc-900 dark:text-zinc-100">
                    {label}
                  </span>
                  <span className="text-xs text-zinc-500">{tag}</span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSlot(idx, idx - 1)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-600"
                      aria-label="Subir"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx >= slotRows.length - 1}
                      onClick={() => moveSlot(idx, idx + 1)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-600"
                      aria-label="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlotAt(idx)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-400"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
        >
          {showManual ? "Ocultar" : "Añadir"} equipos manualmente (opcional)
        </button>
        {showManual ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={3}
              placeholder={"Equipo invitado A\nEquipo invitado B"}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            <button
              type="button"
              onClick={appendManualFromTextarea}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium dark:border-zinc-600"
            >
              Añadir líneas a la lista
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Auto-itinerario (obligatorio para generar)
        </p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Horarios permitidos entre{" "}
          <strong>{tournament.tournamentStartsOn}</strong> y{" "}
          <strong>{tournament.tournamentEndsOn}</strong> (calendario del
          torneo). Si el navegador no limita bien fechas en el selector,
          comprueba que la fecha caiga en ese intervalo; la validación lo
          comprueba al guardar.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Fecha y hora del primer partido
            </label>
            <input
              type="datetime-local"
              required
              min={scheduleDatetimeMin}
              max={scheduleDatetimeMax}
              value={firstMatchDatetime}
              onChange={(e) => setFirstMatchDatetime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Duración por juego
            </label>
            <input
              type="text"
              inputMode="text"
              placeholder="1:30"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Formato H:mm o HH:mm (ej. 1:30). También puedes escribir minutos
              enteros (ej. 90).
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Número de canchas
            </label>
            <input
              type="number"
              min={1}
              max={32}
              value={courtCountInput}
              onChange={(e) => setCourtCountInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Generar partidos
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => handleTogglePublished(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Publicar itinerario en la página del torneo
        </label>
      </div>

      {existingCatSchedule && flatRows.length > 0 ? (
        <div className="mt-8 overflow-x-auto">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Partidos e itinerario
          </h4>
          <table className="mt-3 w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-2 pr-4 font-medium text-zinc-600 dark:text-zinc-400">
                  Fase
                </th>
                <th className="py-2 pr-4 font-medium text-zinc-600 dark:text-zinc-400">
                  Partido
                </th>
                <th className="py-2 pr-4 font-medium text-zinc-600 dark:text-zinc-400">
                  Hora de juego
                </th>
                <th className="py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  Cancha
                </th>
              </tr>
            </thead>
            <tbody>
              {flatRows.map((row) => {
                const as = existingCatSchedule.assignments[row.matchId] ?? {};
                const startsLocal =
                  as.startsAt && as.startsAt.includes("T")
                    ? as.startsAt.slice(0, 16)
                    : as.startsAt ?? "";
                return (
                  <tr
                    key={row.matchId}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                      {row.phaseTitle}
                      <span className="block text-xs text-zinc-500">
                        Ronda {row.round + 1}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-100">
                      {row.label}
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="datetime-local"
                        min={scheduleDatetimeMin}
                        max={scheduleDatetimeMax}
                        value={startsLocal}
                        onChange={(e) =>
                          patchAssignment(row.matchId, {
                            startsAt: e.target.value
                              ? `${e.target.value}:00`
                              : undefined,
                          })
                        }
                        className="w-full min-w-[10rem] rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        placeholder="Cancha 1"
                        value={as.courtLabel ?? ""}
                        onChange={(e) =>
                          patchAssignment(row.matchId, {
                            courtLabel: e.target.value || undefined,
                          })
                        }
                        className="w-full min-w-[6rem] rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          Aún no hay partidos generados para esta categoría.
        </p>
      )}
    </section>
  );
}
