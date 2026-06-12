"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Division, Gender, Tournament, Venue } from "@/lib/types";
import { GENDER_LABELS, formatDateEs, formatUsd } from "@/lib/types";
import TournamentImageInput from "./TournamentImageInput";
import { btnPrimary, btnSecondary, card, inputClass, labelClass } from "./ui";

interface VenueRow {
  key: string;
  label: string;
  courtCount: string;
}

interface DivisionRow {
  key: string;
  label: string;
}

interface CategoryRow {
  key: string;
  ageLabel: string;
  divisionKey: string;
  gender: Gender;
  maxTeams: string;
  customLabel: string;
  feeUsd: string; // override de tarifa (paso 3); vacío = hereda
}

const STEPS = ["Datos generales", "Divisiones y categorías", "Tarifas", "Resumen"];

const GENDER_OPTIONS = Object.entries(GENDER_LABELS) as [Gender, string][];

function newKey(): string {
  return crypto.randomUUID();
}

function parseUsdToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

function isInvalidUsd(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const num = Number(trimmed);
  return Number.isNaN(num) || num < 0;
}

export default function NewTournamentWizard() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Paso 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<"draft" | "open">("draft");
  const [venues, setVenues] = useState<VenueRow[]>([
    { key: "venue-0", label: "", courtCount: "2" },
  ]);

  // Paso 2
  const [divisions, setDivisions] = useState<DivisionRow[]>([
    { key: "division-0", label: "Open" },
  ]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Paso 3
  const [baseFeeUsd, setBaseFeeUsd] = useState("");
  const [publicFeeUsd, setPublicFeeUsd] = useState("");

  // Imagen promocional (paso 1)
  const [promoImage, setPromoImage] = useState<string | null>(null);

  function updateVenue(key: string, patch: Partial<VenueRow>) {
    setVenues((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function updateDivision(key: string, label: string) {
    setDivisions((rows) => rows.map((r) => (r.key === key ? { ...r, label } : r)));
  }

  function removeDivision(key: string) {
    if (categories.some((c) => c.divisionKey === key)) {
      setError("No puedes eliminar una división con categorías asignadas.");
      return;
    }
    setDivisions((rows) => rows.filter((r) => r.key !== key));
  }

  function addCategory() {
    if (divisions.length === 0) {
      setError("Agrega al menos una división antes de crear categorías.");
      return;
    }
    setCategories((rows) => [
      ...rows,
      {
        key: newKey(),
        ageLabel: "",
        divisionKey: divisions[0].key,
        gender: "femenino",
        maxTeams: "",
        customLabel: "",
        feeUsd: "",
      },
    ]);
  }

  function updateCategory(key: string, patch: Partial<CategoryRow>) {
    setCategories((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!name.trim()) return "El nombre del torneo es requerido.";
      if (!startsOn || !endsOn) return "Las fechas de inicio y fin son requeridas.";
      if (endsOn < startsOn) return "La fecha de fin no puede ser antes del inicio.";
      if (!deadline) return "El cierre de inscripciones es requerido.";
      if (venues.length === 0) return "Agrega al menos una sede.";
      for (const v of venues) {
        if (!v.label.trim()) return "Cada sede necesita un nombre.";
        const courts = Number(v.courtCount);
        if (!Number.isInteger(courts) || courts < 1) {
          return "Cada sede necesita al menos 1 cancha.";
        }
      }
      return null;
    }
    if (index === 1) {
      if (divisions.length === 0) return "Agrega al menos una división.";
      for (const d of divisions) {
        if (!d.label.trim()) return "Cada división necesita un nombre.";
      }
      for (const c of categories) {
        if (!c.ageLabel.trim()) return "Cada categoría necesita una edad (p. ej. 14U).";
        if (c.maxTeams.trim()) {
          const max = Number(c.maxTeams);
          if (!Number.isInteger(max) || max < 1) {
            return "El máximo de equipos debe ser un número mayor que 0.";
          }
        }
      }
      return null;
    }
    if (index === 2) {
      if (isInvalidUsd(baseFeeUsd)) return "La tarifa base no es válida.";
      if (isInvalidUsd(publicFeeUsd)) return "La tarifa de entrada al público no es válida.";
      for (const c of categories) {
        if (isInvalidUsd(c.feeUsd)) {
          return `La tarifa de la categoría ${c.ageLabel || "sin nombre"} no es válida.`;
        }
      }
      return null;
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setMaxStepReached((m) => Math.max(m, next));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function goToStep(index: number) {
    if (index > maxStepReached) return;
    if (index > step) {
      const err = validateStep(step);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setStep(index);
  }

  async function submit() {
    for (let i = 0; i < 3; i++) {
      const err = validateStep(i);
      if (err) {
        setError(err);
        setStep(i);
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      const divisionIdByKey = new Map(divisions.map((d) => [d.key, crypto.randomUUID()]));
      const venuesBody: Venue[] = venues.map((v) => ({
        id: crypto.randomUUID(),
        label: v.label.trim(),
        courtCount: Number(v.courtCount),
      }));
      const divisionsBody: Division[] = divisions.map((d) => ({
        id: divisionIdByKey.get(d.key)!,
        label: d.label.trim(),
      }));
      const categoriesBody: Category[] = categories.map((c) => ({
        id: crypto.randomUUID(),
        ageLabel: c.ageLabel.trim(),
        divisionId: divisionIdByKey.get(c.divisionKey) ?? "",
        gender: c.gender,
        feeCents: parseUsdToCents(c.feeUsd),
        maxTeams: c.maxTeams.trim() ? Number(c.maxTeams) : null,
        ...(c.customLabel.trim() ? { customLabel: c.customLabel.trim() } : {}),
      }));

      const body: Partial<Tournament> = {
        name: name.trim(),
        description: description.trim(),
        startsOn,
        endsOn,
        registrationDeadlineOn: deadline,
        status,
        venues: venuesBody,
        divisions: divisionsBody,
        categories: categoriesBody,
        baseFeeCents: parseUsdToCents(baseFeeUsd),
        publicEntryFeeCents: parseUsdToCents(publicFeeUsd),
        promoImageDataUrl: promoImage,
      };

      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { tournament?: Tournament; error?: string }
        | null;
      if (!res.ok || !data?.tournament) {
        setError(data?.error ?? "No se pudo crear el torneo.");
        return;
      }
      router.push(`/admin/torneos/${data.tournament.slug}`);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const divisionLabel = (key: string) =>
    divisions.find((d) => d.key === key)?.label.trim() || "—";

  return (
    <div className="space-y-6">
      {/* Indicador de pasos */}
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => {
          const isCurrent = i === step;
          const isDone = i < step || (i <= maxStepReached && i !== step);
          const clickable = i <= maxStepReached && i !== step;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToStep(i)}
                disabled={!clickable}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-indigo-600 text-white"
                    : isDone
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      : "bg-zinc-100 text-zinc-400"
                } ${clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isCurrent ? "bg-white/20" : isDone ? "bg-indigo-200/60" : "bg-zinc-200"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-zinc-300" />}
            </li>
          );
        })}
      </ol>

      <div className={`${card} p-6`}>
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Datos generales</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nombre del torneo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Copa Juvenil de Verano 2026"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Detalles del torneo para la página pública…"
                />
              </div>
              <div className="sm:col-span-2">
                <TournamentImageInput value={promoImage} onChange={setPromoImage} />
              </div>
              <div>
                <label className={labelClass}>Fecha de inicio *</label>
                <input
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha de fin *</label>
                <input
                  type="date"
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cierre de inscripciones *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Estado inicial</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "open")}
                  className={inputClass}
                >
                  <option value="draft">Borrador</option>
                  <option value="open">Inscripciones abiertas</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Sedes *</label>
                <button
                  type="button"
                  onClick={() =>
                    setVenues((rows) => [...rows, { key: newKey(), label: "", courtCount: "1" }])
                  }
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  + Agregar sede
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {venues.map((v) => (
                  <div key={v.key} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={v.label}
                      onChange={(e) => updateVenue(v.key, { label: e.target.value })}
                      className={inputClass}
                      placeholder="Coliseo Roberto Clemente"
                    />
                    <input
                      type="number"
                      min={1}
                      value={v.courtCount}
                      onChange={(e) => updateVenue(v.key, { courtCount: e.target.value })}
                      className={`${inputClass} w-28 shrink-0`}
                      aria-label="Número de canchas"
                      placeholder="Canchas"
                    />
                    <button
                      type="button"
                      onClick={() => setVenues((rows) => rows.filter((r) => r.key !== v.key))}
                      disabled={venues.length <= 1}
                      className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      aria-label="Eliminar sede"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Nombre de la sede y número de canchas disponibles.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-zinc-900">Divisiones y categorías</h2>

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Divisiones</label>
                <button
                  type="button"
                  onClick={() =>
                    setDivisions((rows) => [...rows, { key: newKey(), label: "" }])
                  }
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  + Agregar división
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {divisions.map((d) => (
                  <div key={d.key} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={d.label}
                      onChange={(e) => updateDivision(d.key, e.target.value)}
                      className={`${inputClass} max-w-xs`}
                      placeholder="Open, Avanzada, Recreativa…"
                    />
                    <button
                      type="button"
                      onClick={() => removeDivision(d.key)}
                      disabled={divisions.length <= 1}
                      className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      aria-label="Eliminar división"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Categorías</label>
                <button
                  type="button"
                  onClick={addCategory}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  + Agregar categoría
                </button>
              </div>
              {categories.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-400">
                  Aún no hay categorías. Agrega la primera (p. ej. 14U Open Femenino).
                </p>
              ) : (
                <div className="thin-scroll mt-2 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                        <th className="py-2 pr-3 font-medium">Edad</th>
                        <th className="py-2 pr-3 font-medium">División</th>
                        <th className="py-2 pr-3 font-medium">Rama</th>
                        <th className="py-2 pr-3 font-medium">Máx. equipos</th>
                        <th className="py-2 pr-3 font-medium">Título manual</th>
                        <th className="py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.key} className="border-b border-zinc-100 last:border-0">
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              value={c.ageLabel}
                              onChange={(e) => updateCategory(c.key, { ageLabel: e.target.value })}
                              className={`${inputClass} w-20`}
                              placeholder="14U"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={c.divisionKey}
                              onChange={(e) =>
                                updateCategory(c.key, { divisionKey: e.target.value })
                              }
                              className={`${inputClass} w-36`}
                            >
                              {divisions.map((d) => (
                                <option key={d.key} value={d.key}>
                                  {d.label.trim() || "(sin nombre)"}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={c.gender}
                              onChange={(e) =>
                                updateCategory(c.key, { gender: e.target.value as Gender })
                              }
                              className={`${inputClass} w-32`}
                            >
                              {GENDER_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={1}
                              value={c.maxTeams}
                              onChange={(e) => updateCategory(c.key, { maxTeams: e.target.value })}
                              className={`${inputClass} w-24`}
                              placeholder="Sin límite"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              value={c.customLabel}
                              onChange={(e) =>
                                updateCategory(c.key, { customLabel: e.target.value })
                              }
                              className={`${inputClass} w-40`}
                              placeholder="Opcional"
                            />
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() =>
                                setCategories((rows) => rows.filter((r) => r.key !== c.key))
                              }
                              className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Eliminar categoría"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Tarifas</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Tarifa base por equipo (USD)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={baseFeeUsd}
                  onChange={(e) => setBaseFeeUsd(e.target.value)}
                  className={inputClass}
                  placeholder="250"
                />
              </div>
              <div>
                <label className={labelClass}>Entrada al público (USD, opcional)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={publicFeeUsd}
                  onChange={(e) => setPublicFeeUsd(e.target.value)}
                  className={inputClass}
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Tarifa por categoría (vacío = hereda la base)</label>
              {categories.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-400">
                  No hay categorías; todas las inscripciones usarán la tarifa base.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {categories.map((c) => (
                    <div key={c.key} className="flex items-center gap-3">
                      <span className="w-56 truncate text-sm text-zinc-700">
                        {c.customLabel.trim() ||
                          [c.ageLabel || "(sin edad)", divisionLabel(c.divisionKey), GENDER_LABELS[c.gender]]
                            .filter(Boolean)
                            .join(" ")}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={c.feeUsd}
                        onChange={(e) => updateCategory(c.key, { feeUsd: e.target.value })}
                        className={`${inputClass} w-36`}
                        placeholder="Hereda"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-zinc-900">Resumen</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Nombre</dt>
                <dd className="mt-0.5 font-medium text-zinc-900">{name.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Estado inicial</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {status === "draft" ? "Borrador" : "Inscripciones abiertas"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Fechas</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {formatDateEs(startsOn)} – {formatDateEs(endsOn)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Cierre de inscripciones</dt>
                <dd className="mt-0.5 text-zinc-900">{formatDateEs(deadline)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-zinc-500">Sedes</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {venues
                    .map((v) => `${v.label.trim()} (${v.courtCount} canchas)`)
                    .join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Tarifa base</dt>
                <dd className="mt-0.5 text-zinc-900">{formatUsd(parseUsdToCents(baseFeeUsd))}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Entrada al público</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {formatUsd(parseUsdToCents(publicFeeUsd))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-zinc-500">
                  Divisiones ({divisions.length}) y categorías ({categories.length})
                </dt>
                <dd className="mt-1 space-y-1 text-zinc-900">
                  {categories.length === 0 ? (
                    <span className="text-zinc-400">Sin categorías definidas.</span>
                  ) : (
                    categories.map((c) => (
                      <p key={c.key}>
                        {c.customLabel.trim() ||
                          [c.ageLabel, divisionLabel(c.divisionKey), GENDER_LABELS[c.gender]]
                            .filter(Boolean)
                            .join(" ")}{" "}
                        <span className="text-zinc-500">
                          · {c.feeUsd.trim() ? formatUsd(parseUsdToCents(c.feeUsd)) : "tarifa base"}
                          {c.maxTeams.trim() ? ` · máx. ${c.maxTeams} equipos` : ""}
                        </span>
                      </p>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {error && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-5">
          <button type="button" onClick={goBack} className={btnSecondary} disabled={step === 0}>
            Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className={btnPrimary}>
              Continuar
            </button>
          ) : (
            <button type="button" onClick={submit} className={btnPrimary} disabled={submitting}>
              {submitting ? "Creando…" : "Crear torneo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
