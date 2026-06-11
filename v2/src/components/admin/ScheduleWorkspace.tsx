"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CategorySchedule,
  Match,
  Registration,
  ScheduleTemplate,
  Tournament,
  TournamentSchedule,
} from "@/lib/types";
import {
  APPROVAL_STATUS_LABELS,
  categoryLabel,
  formatSetScores,
  isBracketEligible,
} from "@/lib/types";
import {
  autoAssignSchedule,
  categoryChampion,
  computePoolStandings,
  generatePoolsBracket,
  generateSingleElim,
  isByeMatch,
  playableMatches,
  resolveSide,
} from "@/lib/schedule-engine";
import { btnDanger, btnPrimary, btnSecondary, card, inputClass, labelClass } from "./ui";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  tournament: Tournament;
  registrations: Registration[];
}

function emptySchedule(): TournamentSchedule {
  return { published: false, categories: [] };
}

function courtOptions(tournament: Tournament): string[] {
  const single = tournament.venues.length === 1;
  return tournament.venues.flatMap((venue) =>
    Array.from({ length: Math.max(venue.courtCount, 1) }, (_, i) =>
      single ? `Cancha ${i + 1}` : `${venue.label} · Cancha ${i + 1}`,
    ),
  );
}

function defaultStartLocal(tournament: Tournament): string {
  return `${tournament.startsOn || new Date().toISOString().slice(0, 10)}T09:00`;
}

function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "Sin horario";
  return new Date(iso).toLocaleString("es-PR", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PR", { hour: "numeric", minute: "2-digit" });
}

function formatDayHeading(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const AGENDA_TAB = "__agenda__";

export default function ScheduleWorkspace({ tournament, registrations }: Props) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<TournamentSchedule>(
    tournament.schedule ?? emptySchedule(),
  );
  const [activeTab, setActiveTab] = useState<string>(
    tournament.categories[0]?.id ?? AGENDA_TAB,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const activeCategory = tournament.categories.find((c) => c.id === activeTab);
  const activeSchedule = schedule.categories.find((cs) => cs.categoryId === activeTab);

  async function persist(next: TournamentSchedule) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo guardar");
      }
      setSchedule(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function upsertCategorySchedule(cs: CategorySchedule) {
    const others = schedule.categories.filter((c) => c.categoryId !== cs.categoryId);
    void persist({ ...schedule, categories: [...others, cs] });
  }

  function updateMatch(categoryId: string, matchId: string, patch: Partial<Match>) {
    const cs = schedule.categories.find((c) => c.categoryId === categoryId);
    if (!cs) return;
    const matches = cs.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m));
    upsertCategorySchedule({ ...cs, matches });
  }

  function removeCategorySchedule() {
    const next = {
      ...schedule,
      categories: schedule.categories.filter((c) => c.categoryId !== activeTab),
    };
    setConfirmReset(false);
    void persist(next);
  }

  if (tournament.categories.length === 0) {
    return (
      <div className={`${card} p-8 text-center text-sm text-zinc-500`}>
        Este torneo no tiene categorías todavía. Crea las categorías en la
        configuración del torneo antes de armar el itinerario.
      </div>
    );
  }

  const generatedCount = schedule.categories.length;

  return (
    <div className="space-y-6">
      {/* Publicación */}
      <div className={`${card} flex flex-wrap items-center justify-between gap-4 p-4`}>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              schedule.published
                ? "bg-emerald-100 text-emerald-700"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                schedule.published ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {schedule.published ? "Publicado" : "Borrador"}
          </span>
          <p className="text-sm text-zinc-500">
            {schedule.published
              ? "El itinerario es visible en el website público."
              : "El público no ve este itinerario hasta que lo publiques."}
          </p>
        </div>
        <button
          type="button"
          className={schedule.published ? btnSecondary : btnPrimary}
          disabled={saving || schedule.categories.length === 0}
          onClick={() => void persist({ ...schedule, published: !schedule.published })}
        >
          {schedule.published ? "Despublicar" : "Publicar itinerario"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Tabs: categorías + agenda general */}
      <div className="flex flex-wrap gap-2">
        {tournament.categories.map((cat) => {
          const has = schedule.categories.some((cs) => cs.categoryId === cat.id);
          const active = cat.id === activeTab;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {categoryLabel(tournament, cat)}
              {has ? <span className="ml-1.5 text-xs opacity-80">●</span> : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setActiveTab(AGENDA_TAB)}
          disabled={generatedCount === 0}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            activeTab === AGENDA_TAB
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          📋 Agenda general
        </button>
      </div>

      {activeTab === AGENDA_TAB ? (
        <AgendaView
          tournament={tournament}
          schedule={schedule}
          saving={saving}
          onUpdateMatch={updateMatch}
        />
      ) : activeCategory ? (
        activeSchedule ? (
          <CategoryScheduleView
            tournament={tournament}
            cs={activeSchedule}
            saving={saving}
            onUpdateMatch={(matchId, patch) => updateMatch(activeCategory.id, matchId, patch)}
            onRequestReset={() => setConfirmReset(true)}
          />
        ) : (
          <CategoryBuilder
            key={activeCategory.id}
            tournament={tournament}
            categoryId={activeCategory.id}
            registrations={registrations.filter((r) => r.categoryId === activeCategory.id)}
            saving={saving}
            onGenerate={upsertCategorySchedule}
          />
        )
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title="Eliminar itinerario de la categoría"
        description="Se borran los partidos y resultados de esta categoría para que puedas generarlos de nuevo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar y regenerar"
        busy={saving}
        onConfirm={removeCategorySchedule}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agenda general: todos los partidos del torneo en orden cronológico,
// agrupados por día, con detección de conflictos de cancha entre categorías.
// ---------------------------------------------------------------------------

interface AgendaItem {
  match: Match;
  categoryId: string;
  catLabel: string;
  durationMinutes: number;
  homeLabel: string;
  awayLabel: string;
  conflict: boolean;
}

function AgendaView({
  tournament,
  schedule,
  saving,
  onUpdateMatch,
}: {
  tournament: Tournament;
  schedule: TournamentSchedule;
  saving: boolean;
  onUpdateMatch: (categoryId: string, matchId: string, patch: Partial<Match>) => void;
}) {
  const courts = useMemo(() => courtOptions(tournament), [tournament]);

  const { days, unscheduled, conflictCount } = useMemo(() => {
    const items: AgendaItem[] = [];
    for (const cs of schedule.categories) {
      const cat = tournament.categories.find((c) => c.id === cs.categoryId);
      const label = cat ? categoryLabel(tournament, cat) : cs.categoryId;
      for (const m of cs.matches) {
        if (isByeMatch(m)) continue;
        items.push({
          match: m,
          categoryId: cs.categoryId,
          catLabel: label,
          durationMinutes: cs.settings.durationMinutes,
          homeLabel: resolveSide(cs, m.home).label,
          awayLabel: resolveSide(cs, m.away).label,
          conflict: false,
        });
      }
    }

    // Conflictos: misma cancha con horarios solapados
    const timed = items.filter((it) => it.match.startsAt && it.match.court);
    for (let i = 0; i < timed.length; i++) {
      for (let j = i + 1; j < timed.length; j++) {
        const a = timed[i];
        const b = timed[j];
        if (a.match.court !== b.match.court) continue;
        const startA = new Date(a.match.startsAt!).getTime();
        const endA = startA + a.durationMinutes * 60_000;
        const startB = new Date(b.match.startsAt!).getTime();
        const endB = startB + b.durationMinutes * 60_000;
        if (startA < endB && startB < endA) {
          a.conflict = true;
          b.conflict = true;
        }
      }
    }

    const scheduled = items
      .filter((it) => it.match.startsAt)
      .sort((x, y) => x.match.startsAt!.localeCompare(y.match.startsAt!));
    const unscheduled = items.filter((it) => !it.match.startsAt);

    const days = new Map<string, AgendaItem[]>();
    for (const it of scheduled) {
      const dayKey = it.match.startsAt!.slice(0, 10);
      const list = days.get(dayKey) ?? [];
      list.push(it);
      days.set(dayKey, list);
    }
    const conflictCount = items.filter((it) => it.conflict).length;
    return { days: [...days.entries()], unscheduled, conflictCount };
  }, [schedule, tournament]);

  if (days.length === 0 && unscheduled.length === 0) {
    return (
      <div className={`${card} p-8 text-center text-sm text-zinc-500`}>
        Genera el itinerario de al menos una categoría para ver la agenda general.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {conflictCount > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠️ Hay <strong>{conflictCount}</strong> partidos con conflicto de cancha (misma
          cancha a la misma hora). Están marcados en rojo — edita su horario o cancha.
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ Sin conflictos de cancha entre categorías.
        </div>
      )}

      {days.map(([dayKey, items]) => (
        <div key={dayKey} className={`${card} overflow-hidden`}>
          <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3">
            <h3 className="text-sm font-semibold capitalize text-zinc-900">
              {formatDayHeading(items[0].match.startsAt!)}
            </h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {items.map((it) => (
              <AgendaRow
                key={it.match.id}
                item={it}
                courts={courts}
                saving={saving}
                onUpdate={(patch) => onUpdateMatch(it.categoryId, it.match.id, patch)}
              />
            ))}
          </div>
        </div>
      ))}

      {unscheduled.length > 0 ? (
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-zinc-200 bg-amber-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-amber-800">
              Sin horario asignado ({unscheduled.length})
            </h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {unscheduled.map((it) => (
              <AgendaRow
                key={it.match.id}
                item={it}
                courts={courts}
                saving={saving}
                onUpdate={(patch) => onUpdateMatch(it.categoryId, it.match.id, patch)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AgendaRow({
  item,
  courts,
  saving,
  onUpdate,
}: {
  item: AgendaItem;
  courts: string[];
  saving: boolean;
  onUpdate: (patch: Partial<Match>) => void;
}) {
  const { match } = item;
  const [editing, setEditing] = useState(false);
  const [timeLocal, setTimeLocal] = useState(toLocalInput(match.startsAt));
  const [court, setCourt] = useState(match.court ?? "");

  return (
    <div className={`px-5 py-2.5 ${item.conflict ? "bg-red-50" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="w-16 text-sm font-semibold tabular-nums text-zinc-900">
          {match.startsAt ? formatClock(match.startsAt) : "—"}
        </span>
        <span
          className={`w-32 truncate text-xs font-medium ${
            item.conflict ? "text-red-700" : "text-zinc-500"
          }`}
        >
          {match.court ?? "Sin cancha"}
          {item.conflict ? " ⚠️" : ""}
        </span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
          {item.catLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
          {item.homeLabel} <span className="text-zinc-400">vs</span> {item.awayLabel}
        </span>
        {match.result ? (
          <span className="flex items-center gap-1.5">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
              {match.result.home}–{match.result.away}
            </span>
            {formatSetScores(match.result) ? (
              <span className="hidden text-[11px] tabular-nums text-zinc-400 lg:inline">
                ({formatSetScores(match.result)})
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[11px] uppercase tracking-wide text-zinc-400">
            {match.phaseLabel}
          </span>
        )}
        <button
          type="button"
          className="text-xs text-indigo-600 hover:underline"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Cancelar" : "Mover"}
        </button>
      </div>
      {editing ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3">
          <div>
            <label className={labelClass}>Fecha y hora</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Cancha</label>
            <select className={inputClass} value={court} onChange={(e) => setCourt(e.target.value)}>
              <option value="">Sin cancha</option>
              {courts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={btnSecondary}
            disabled={saving}
            onClick={() => {
              onUpdate({
                startsAt: timeLocal ? new Date(timeLocal).toISOString() : undefined,
                court: court || undefined,
              });
              setEditing(false);
            }}
          >
            Guardar
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Builder: seleccionar y ordenar la siembra, plantilla y generar partidos
// ---------------------------------------------------------------------------

function CategoryBuilder({
  tournament,
  categoryId,
  registrations,
  saving,
  onGenerate,
}: {
  tournament: Tournament;
  categoryId: string;
  registrations: Registration[];
  saving: boolean;
  onGenerate: (cs: CategorySchedule) => void;
}) {
  const eligible = useMemo(
    () =>
      registrations
        .filter(isBracketEligible)
        .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt)),
    [registrations],
  );
  const courts = useMemo(() => courtOptions(tournament), [tournament]);
  const eligibleById = useMemo(() => new Map(eligible.map((r) => [r.id, r])), [eligible]);

  // La siembra es el orden de esta lista (ids de inscripciones seleccionadas).
  const [seedOrder, setSeedOrder] = useState<string[]>(eligible.map((r) => r.id));
  const [manualTeams, setManualTeams] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [template, setTemplate] = useState<ScheduleTemplate>("single_elim");
  const [poolCount, setPoolCount] = useState(2);
  const [advancePerPool, setAdvancePerPool] = useState(2);
  const [startLocal, setStartLocal] = useState(defaultStartLocal(tournament));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedCourts, setSelectedCourts] = useState<string[]>(courts);
  const [validation, setValidation] = useState<string | null>(null);

  const teamCount = seedOrder.length + manualTeams.length;
  const unselected = eligible.filter((r) => !seedOrder.includes(r.id));

  function moveSeed(index: number, delta: number) {
    setSeedOrder((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeSeed(id: string) {
    setSeedOrder((prev) => prev.filter((x) => x !== id));
  }

  function addSeed(id: string) {
    setSeedOrder((prev) => [...prev, id]);
  }

  function toggleCourt(court: string) {
    setSelectedCourts((prev) =>
      prev.includes(court) ? prev.filter((c) => c !== court) : [...prev, court],
    );
  }

  function generate() {
    if (teamCount < 2) {
      setValidation("Necesitas al menos 2 equipos para generar partidos.");
      return;
    }
    if (selectedCourts.length === 0) {
      setValidation("Selecciona al menos una cancha.");
      return;
    }
    if (!startLocal) {
      setValidation("Indica la fecha y hora del primer partido.");
      return;
    }
    if (template === "pools_bracket" && teamCount < poolCount * 2) {
      setValidation("No hay suficientes equipos para esa cantidad de pools.");
      return;
    }
    setValidation(null);

    const orderedRegs = seedOrder
      .map((id) => eligibleById.get(id))
      .filter((r): r is Registration => Boolean(r));
    const teams = [
      ...orderedRegs.map((r, i) => ({
        seed: i,
        label: r.teamName,
        registrationId: r.id,
      })),
      ...manualTeams.map((label, i) => ({
        seed: orderedRegs.length + i,
        label,
      })),
    ];

    const settings = {
      template,
      startAt: new Date(startLocal).toISOString(),
      durationMinutes,
      courts: selectedCourts,
      ...(template === "pools_bracket" ? { poolCount, advancePerPool } : {}),
    };
    const generated =
      template === "single_elim"
        ? generateSingleElim(teams.length)
        : generatePoolsBracket(teams.length, poolCount, advancePerPool);
    const matches = autoAssignSchedule(generated.matches, settings);

    onGenerate({
      categoryId,
      teams,
      pools: generated.pools,
      matches,
      settings,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Siembra */}
      <div className={`${card} p-5`}>
        <h3 className="text-sm font-semibold text-zinc-900">1. Siembra del bracket</h3>
        <p className="mt-1 text-xs text-zinc-500">
          El #1 es el mejor sembrado. Usa las flechas para ajustar el orden — la siembra
          determina los cruces del bracket.
        </p>
        <div className="mt-4 space-y-1.5">
          {seedOrder.length === 0 && unselected.length === 0 ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
              No hay inscripciones elegibles (pagadas o aprobadas) en esta categoría.
            </p>
          ) : (
            seedOrder.map((id, i) => {
              const r = eligibleById.get(id);
              if (!r) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <span className="w-7 text-xs font-bold text-indigo-600">#{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                    {r.teamName}
                  </span>
                  <span className="hidden text-xs text-zinc-400 sm:block">
                    {APPROVAL_STATUS_LABELS[r.approval]}
                    {r.paymentStatus === "paid" ? " · Pagado" : " · Debe"}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Subir"
                      disabled={i === 0}
                      onClick={() => moveSeed(i, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Bajar"
                      disabled={i === seedOrder.length - 1}
                      onClick={() => moveSeed(i, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label="Quitar del bracket"
                      onClick={() => removeSeed(id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {unselected.length > 0 ? (
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <p className="mb-2 text-xs font-medium text-zinc-500">Fuera del bracket</p>
            <div className="space-y-1.5">
              {unselected.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500"
                >
                  <span className="min-w-0 flex-1 truncate">{r.teamName}</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-indigo-600 hover:underline"
                    onClick={() => addSeed(r.id)}
                  >
                    + Incluir
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 border-t border-zinc-100 pt-4">
          <label className={labelClass}>Añadir equipo manual</label>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Nombre del equipo"
            />
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                if (!manualInput.trim()) return;
                setManualTeams((prev) => [...prev, manualInput.trim()]);
                setManualInput("");
              }}
            >
              Añadir
            </button>
          </div>
          {manualTeams.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {manualTeams.map((t, i) => (
                <li
                  key={`${t}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700"
                >
                  <span>
                    <span className="mr-2 text-xs font-bold text-indigo-600">
                      #{seedOrder.length + i + 1}
                    </span>
                    {t}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => setManualTeams((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="mt-3 text-xs font-medium text-zinc-500">
          {teamCount} equipo{teamCount === 1 ? "" : "s"} en el bracket
        </p>
      </div>

      {/* Formato y horarios */}
      <div className={`${card} space-y-4 p-5`}>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">2. Formato</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTemplate("single_elim")}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                template === "single_elim"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <span className="font-medium">Eliminación sencilla</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Bracket directo; pierdes y quedas fuera.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTemplate("pools_bracket")}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                template === "pools_bracket"
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <span className="font-medium">Pools + bracket</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Round robin por pool y clasifican los mejores.
              </span>
            </button>
          </div>
          {template === "pools_bracket" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cantidad de pools</label>
                <input
                  type="number"
                  min={2}
                  max={8}
                  className={inputClass}
                  value={poolCount}
                  onChange={(e) => setPoolCount(Math.max(2, Number(e.target.value) || 2))}
                />
              </div>
              <div>
                <label className={labelClass}>Clasifican por pool</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  className={inputClass}
                  value={advancePerPool}
                  onChange={(e) => setAdvancePerPool(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">3. Horarios y canchas</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Primer partido</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Duración por partido (min)</label>
              <input
                type="number"
                min={20}
                step={5}
                className={inputClass}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(20, Number(e.target.value) || 60))}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>Canchas disponibles</label>
            {courts.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Este torneo no tiene sedes con canchas; añádelas en Configuración.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {courts.map((court) => (
                  <label
                    key={court}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      selectedCourts.includes(court)
                        ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedCourts.includes(court)}
                      onChange={() => toggleCourt(court)}
                    />
                    {court}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {validation ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{validation}</p>
        ) : null}

        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={saving}
          onClick={generate}
        >
          {saving ? "Generando…" : "Generar partidos"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista de categoría: lista de partidos / bracket visual / standings
// ---------------------------------------------------------------------------

function CategoryScheduleView({
  tournament,
  cs,
  saving,
  onUpdateMatch,
  onRequestReset,
}: {
  tournament: Tournament;
  cs: CategorySchedule;
  saving: boolean;
  onUpdateMatch: (matchId: string, patch: Partial<Match>) => void;
  onRequestReset: () => void;
}) {
  const matches = playableMatches(cs);
  const phases = [...new Set(matches.map((m) => m.phaseLabel))];
  const champion = categoryChampion(cs);
  const courts = courtOptions(tournament);
  const played = matches.filter((m) => m.result).length;
  const [view, setView] = useState<"list" | "bracket">("list");

  const hasBracket = cs.matches.some((m) => !m.poolId);

  return (
    <div className="space-y-5">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <div className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">{cs.teams.length}</span> equipos ·{" "}
          <span className="font-semibold text-zinc-900">{matches.length}</span> partidos ·{" "}
          <span className="font-semibold text-zinc-900">{played}</span> jugados
        </div>
        <div className="flex items-center gap-2">
          {hasBracket ? (
            <div className="flex rounded-lg border border-zinc-300 p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === "list" ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView("bracket")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === "bracket"
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                Bracket
              </button>
            </div>
          ) : null}
          <button type="button" className={btnDanger} onClick={onRequestReset}>
            Eliminar y regenerar
          </button>
        </div>
      </div>

      {champion ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          🏆 Campeón de la categoría: {champion}
        </div>
      ) : null}

      {view === "bracket" && hasBracket ? <BracketView cs={cs} /> : null}

      {view === "list" ? (
        <>
          {cs.pools.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {cs.pools.map((pool) => {
                const { standings } = computePoolStandings(cs, pool.id);
                return (
                  <div key={pool.id} className={`${card} p-4`}>
                    <h4 className="text-sm font-semibold text-zinc-900">{pool.label}</h4>
                    <table className="mt-2 w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-400">
                          <th className="py-1 font-medium">Equipo</th>
                          <th className="py-1 text-center font-medium">G</th>
                          <th className="py-1 text-center font-medium">P</th>
                          <th className="py-1 text-center font-medium">Dif</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s) => (
                          <tr key={s.seed} className="border-t border-zinc-100">
                            <td className="py-1.5 text-zinc-800">
                              {cs.teams.find((t) => t.seed === s.seed)?.label ?? "—"}
                            </td>
                            <td className="py-1.5 text-center">{s.wins}</td>
                            <td className="py-1.5 text-center">{s.losses}</td>
                            <td className="py-1.5 text-center">
                              {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : null}

          {phases.map((phase) => (
            <div key={phase} className={`${card} p-4`}>
              <h4 className="text-sm font-semibold text-zinc-900">{phase}</h4>
              <div className="mt-3 space-y-2">
                {matches
                  .filter((m) => m.phaseLabel === phase)
                  .map((m) => (
                    <MatchRow
                      key={m.id}
                      cs={cs}
                      match={m}
                      courts={courts}
                      saving={saving}
                      onUpdate={(patch) => onUpdateMatch(m.id, patch)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bracket visual: columnas por ronda de eliminación
// ---------------------------------------------------------------------------

function BracketView({ cs }: { cs: CategorySchedule }) {
  const elimMatches = cs.matches.filter((m) => !m.poolId);
  const rounds = [...new Set(elimMatches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className={`${card} overflow-x-auto p-5`}>
      <div className="flex min-w-max gap-6">
        {rounds.map((round) => {
          const roundMatches = elimMatches
            .filter((m) => m.round === round)
            .sort((a, b) => a.order - b.order);
          const label = roundMatches[0]?.phaseLabel ?? `Ronda ${round}`;
          return (
            <div key={round} className="flex w-56 flex-col">
              <h4 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {label}
              </h4>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {roundMatches.map((m) => (
                  <BracketMatchCard key={m.id} cs={cs} match={m} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketMatchCard({ cs, match }: { cs: CategorySchedule; match: Match }) {
  const home = resolveSide(cs, match.home);
  const away = resolveSide(cs, match.away);
  const bye = isByeMatch(match);
  const winnerHome = match.result != null && match.result.home > match.result.away;
  const winnerAway = match.result != null && match.result.away > match.result.home;

  return (
    <div
      className={`overflow-hidden rounded-lg border text-sm ${
        bye ? "border-dashed border-zinc-200 opacity-50" : "border-zinc-200"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 ${
          winnerHome ? "bg-emerald-50 font-semibold text-emerald-900" : "text-zinc-800"
        }`}
      >
        <span className={`truncate ${home.decided ? "" : "italic text-zinc-400"}`}>
          {home.label}
        </span>
        {match.result ? <span className="tabular-nums">{match.result.home}</span> : null}
      </div>
      <div
        className={`flex items-center justify-between gap-2 border-t border-zinc-100 px-3 py-1.5 ${
          winnerAway ? "bg-emerald-50 font-semibold text-emerald-900" : "text-zinc-800"
        }`}
      >
        <span className={`truncate ${away.decided ? "" : "italic text-zinc-400"}`}>
          {away.label}
        </span>
        {match.result ? <span className="tabular-nums">{match.result.away}</span> : null}
      </div>
      {!bye && (match.startsAt || match.court || formatSetScores(match.result)) ? (
        <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-1 text-[11px] text-zinc-500">
          {formatSetScores(match.result) ? (
            <span className="tabular-nums">{formatSetScores(match.result)}</span>
          ) : (
            <>
              {formatTime(match.startsAt)}
              {match.court ? ` · ${match.court}` : ""}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fila de partido (lista)
// ---------------------------------------------------------------------------

const MAX_SETS = 5;

interface SetInput {
  h: string;
  a: string;
}

function setsFromResult(match: Match): SetInput[] {
  const existing = match.result?.sets?.map((s) => ({
    h: String(s.home),
    a: String(s.away),
  }));
  const rows = existing ?? [];
  while (rows.length < 3) rows.push({ h: "", a: "" });
  return rows;
}

function MatchRow({
  cs,
  match,
  courts,
  saving,
  onUpdate,
}: {
  cs: CategorySchedule;
  match: Match;
  courts: string[];
  saving: boolean;
  onUpdate: (patch: Partial<Match>) => void;
}) {
  const home = resolveSide(cs, match.home);
  const away = resolveSide(cs, match.away);
  const ready = home.decided && away.decided;
  const [editing, setEditing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [setInputs, setSetInputs] = useState<SetInput[]>(() => setsFromResult(match));
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [timeLocal, setTimeLocal] = useState(toLocalInput(match.startsAt));
  const [court, setCourt] = useState(match.court ?? "");

  function openScorer() {
    setSetInputs(setsFromResult(match));
    setScoreError(null);
    setScoring(true);
    setEditing(false);
  }

  function updateSet(index: number, side: "h" | "a", value: string) {
    setSetInputs((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [side]: value } : s)),
    );
  }

  function saveSets() {
    const complete = setInputs
      .map((s) => ({ home: Number(s.h), away: Number(s.a), raw: s }))
      .filter(
        (s) =>
          s.raw.h !== "" &&
          s.raw.a !== "" &&
          Number.isFinite(s.home) &&
          Number.isFinite(s.away) &&
          s.home >= 0 &&
          s.away >= 0,
      );
    if (complete.length === 0) {
      setScoreError("Anota al menos un set completo.");
      return;
    }
    if (complete.some((s) => s.home === s.away)) {
      setScoreError("Un set no puede terminar empatado.");
      return;
    }
    const setsHome = complete.filter((s) => s.home > s.away).length;
    const setsAway = complete.length - setsHome;
    if (setsHome === setsAway) {
      setScoreError("El partido no puede quedar empatado en sets.");
      return;
    }
    setScoreError(null);
    onUpdate({
      result: {
        home: setsHome,
        away: setsAway,
        sets: complete.map((s) => ({ home: s.home, away: s.away })),
        recordedAt: new Date().toISOString(),
      },
    });
    setScoring(false);
  }

  function saveAssignment() {
    onUpdate({
      startsAt: timeLocal ? new Date(timeLocal).toISOString() : undefined,
      court: court || undefined,
    });
    setEditing(false);
  }

  const winnerHome = match.result != null && match.result.home > match.result.away;
  const setsLine = formatSetScores(match.result);

  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-44 text-xs text-zinc-500">
          <div>{formatTime(match.startsAt)}</div>
          <div>{match.court ?? "Sin cancha"}</div>
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <span
            className={`${home.decided ? "text-zinc-900" : "italic text-zinc-400"} ${
              match.result && winnerHome ? "font-semibold" : ""
            }`}
          >
            {home.label}
          </span>
          <span className="mx-2 text-zinc-400">vs</span>
          <span
            className={`${away.decided ? "text-zinc-900" : "italic text-zinc-400"} ${
              match.result && !winnerHome ? "font-semibold" : ""
            }`}
          >
            {away.label}
          </span>
        </div>
        {match.result ? (
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-sm font-semibold text-white">
              {match.result.home} – {match.result.away}
            </span>
            {setsLine ? (
              <span className="text-xs tabular-nums text-zinc-500">({setsLine})</span>
            ) : null}
          </div>
        ) : ready ? (
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            disabled={saving}
            onClick={() => (scoring ? setScoring(false) : openScorer())}
          >
            {scoring ? "Cancelar" : "Anotar"}
          </button>
        ) : (
          <span className="text-xs italic text-zinc-400">Por definir</span>
        )}
        <div className="flex items-center gap-2">
          {match.result ? (
            <>
              <button
                type="button"
                className="text-xs text-indigo-600 hover:underline"
                disabled={saving}
                onClick={openScorer}
              >
                Editar sets
              </button>
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-red-600 hover:underline"
                disabled={saving}
                onClick={() => {
                  setScoring(false);
                  onUpdate({ result: null });
                }}
              >
                Borrar resultado
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="text-xs text-indigo-600 hover:underline"
            onClick={() => {
              setEditing((v) => !v);
              setScoring(false);
            }}
          >
            {editing ? "Cancelar" : "Editar horario"}
          </button>
        </div>
      </div>

      {/* Anotador por sets */}
      {scoring ? (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <div className="flex flex-wrap items-start gap-4">
            <table className="text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-400">
                  <th className="pb-1 pr-3 font-medium" />
                  <th className="w-20 pb-1 pr-2 text-center font-medium">
                    <span className="block max-w-20 truncate">{home.label}</span>
                  </th>
                  <th className="w-20 pb-1 text-center font-medium">
                    <span className="block max-w-20 truncate">{away.label}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {setInputs.map((s, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-3 text-xs font-medium text-zinc-500">
                      Set {i + 1}
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min={0}
                        className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-center text-sm"
                        value={s.h}
                        onChange={(e) => updateSet(i, "h", e.target.value)}
                        aria-label={`Set ${i + 1} puntos ${home.label}`}
                      />
                    </td>
                    <td className="py-1">
                      <input
                        type="number"
                        min={0}
                        className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-center text-sm"
                        value={s.a}
                        onChange={(e) => updateSet(i, "a", e.target.value)}
                        aria-label={`Set ${i + 1} puntos ${away.label}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-2">
              {setInputs.length < MAX_SETS ? (
                <button
                  type="button"
                  className="rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:border-indigo-400 hover:text-indigo-600"
                  onClick={() => setSetInputs((prev) => [...prev, { h: "", a: "" }])}
                >
                  + Añadir set
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                disabled={saving}
                onClick={saveSets}
              >
                {saving ? "Guardando…" : "Guardar resultado"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Los sets vacíos se ignoran. El ganador del partido se calcula por sets ganados.
          </p>
          {scoreError ? (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {scoreError}
            </p>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3">
          <div>
            <label className={labelClass}>Fecha y hora</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Cancha</label>
            <select
              className={inputClass}
              value={court}
              onChange={(e) => setCourt(e.target.value)}
            >
              <option value="">Sin cancha</option>
              {courts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={btnSecondary}
            disabled={saving}
            onClick={saveAssignment}
          >
            Guardar horario
          </button>
        </div>
      ) : null}
    </div>
  );
}
