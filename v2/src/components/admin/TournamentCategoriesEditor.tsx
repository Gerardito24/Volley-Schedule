"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Division, Gender, Tournament } from "@/lib/types";
import { GENDER_LABELS, formatUsd } from "@/lib/types";
import { btnPrimary, card, inputClass } from "./ui";

interface CategoryRow {
  id: string;
  ageLabel: string;
  divisionId: string;
  gender: Gender;
  feeUsd: string;
  maxTeams: string;
  customLabel: string;
  editing: boolean;
}

const GENDER_OPTIONS = Object.entries(GENDER_LABELS) as [Gender, string][];

function centsToUsdInput(cents: number | null): string {
  return cents == null ? "" : String(cents / 100);
}

function parseUsdToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

export default function TournamentCategoriesEditor({ tournament }: { tournament: Tournament }) {
  const router = useRouter();

  const [divisions, setDivisions] = useState<Division[]>(
    tournament.divisions.map((d) => ({ ...d })),
  );
  const [rows, setRows] = useState<CategoryRow[]>(
    tournament.categories.map((c) => ({
      id: c.id,
      ageLabel: c.ageLabel,
      divisionId: c.divisionId,
      gender: c.gender,
      feeUsd: centsToUsdInput(c.feeCents),
      maxTeams: c.maxTeams == null ? "" : String(c.maxTeams),
      customLabel: c.customLabel ?? "",
      editing: false,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function divisionLabel(id: string): string {
    return divisions.find((d) => d.id === id)?.label ?? "—";
  }

  function updateRow(id: string, patch: Partial<CategoryRow>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (divisions.length === 0) {
      setError("Agrega al menos una división antes de crear categorías.");
      return;
    }
    setRows((r) => [
      ...r,
      {
        id: crypto.randomUUID(),
        ageLabel: "",
        divisionId: divisions[0].id,
        gender: "femenino",
        feeUsd: "",
        maxTeams: "",
        customLabel: "",
        editing: true,
      },
    ]);
  }

  function removeDivision(id: string) {
    if (rows.some((r) => r.divisionId === id)) {
      setError("No puedes eliminar una división con categorías asignadas.");
      return;
    }
    setError(null);
    setDivisions((d) => d.filter((div) => div.id !== id));
  }

  async function save() {
    setMessage(null);
    setError(null);

    if (divisions.length === 0) {
      setError("Agrega al menos una división.");
      return;
    }
    if (divisions.some((d) => !d.label.trim())) {
      setError("Cada división necesita un nombre.");
      return;
    }
    if (rows.some((r) => !r.ageLabel.trim())) {
      setError("Cada categoría necesita una edad (p. ej. 14U).");
      return;
    }
    for (const r of rows) {
      if (r.feeUsd.trim()) {
        const fee = Number(r.feeUsd);
        if (Number.isNaN(fee) || fee < 0) {
          setError(`La tarifa de la categoría ${r.ageLabel} no es válida.`);
          return;
        }
      }
      if (r.maxTeams.trim()) {
        const max = Number(r.maxTeams);
        if (!Number.isInteger(max) || max < 1) {
          setError(`El máximo de equipos de la categoría ${r.ageLabel} no es válido.`);
          return;
        }
      }
    }

    const categoriesBody: Category[] = rows.map((r) => ({
      id: r.id,
      ageLabel: r.ageLabel.trim(),
      divisionId: r.divisionId,
      gender: r.gender,
      feeCents: parseUsdToCents(r.feeUsd),
      maxTeams: r.maxTeams.trim() ? Number(r.maxTeams) : null,
      ...(r.customLabel.trim() ? { customLabel: r.customLabel.trim() } : {}),
    }));
    const divisionsBody: Division[] = divisions.map((d) => ({
      id: d.id,
      label: d.label.trim(),
    }));

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divisions: divisionsBody, categories: categoriesBody }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudieron guardar los cambios.");
        return;
      }
      setRows((r) => r.map((row) => ({ ...row, editing: false })));
      setMessage("Categorías guardadas.");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={`${card} p-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Divisiones</h2>
          <button
            type="button"
            onClick={() =>
              setDivisions((d) => [...d, { id: crypto.randomUUID(), label: "" }])
            }
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            + Agregar división
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {divisions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-400">
              No hay divisiones. Agrega una para poder crear categorías.
            </p>
          ) : (
            divisions.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={d.label}
                  onChange={(e) =>
                    setDivisions((divs) =>
                      divs.map((div) =>
                        div.id === d.id ? { ...div, label: e.target.value } : div,
                      ),
                    )
                  }
                  className={`${inputClass} max-w-xs`}
                  placeholder="Open, Avanzada…"
                />
                <button
                  type="button"
                  onClick={() => removeDivision(d.id)}
                  className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar división"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`${card} p-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Categorías</h2>
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            + Agregar categoría
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            Este torneo aún no tiene categorías.
          </p>
        ) : (
          <div className="thin-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Edad</th>
                  <th className="py-2 pr-3 font-medium">División</th>
                  <th className="py-2 pr-3 font-medium">Rama</th>
                  <th className="py-2 pr-3 font-medium">Tarifa (USD)</th>
                  <th className="py-2 pr-3 font-medium">Máx. equipos</th>
                  <th className="py-2 pr-3 font-medium">Título manual</th>
                  <th className="py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
                  r.editing ? (
                    <tr key={r.id} className="border-b border-zinc-100 bg-indigo-50/40 last:border-0">
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={r.ageLabel}
                          onChange={(e) => updateRow(r.id, { ageLabel: e.target.value })}
                          className={`${inputClass} w-20`}
                          placeholder="14U"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={r.divisionId}
                          onChange={(e) => updateRow(r.id, { divisionId: e.target.value })}
                          className={`${inputClass} w-32`}
                        >
                          {divisions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.label.trim() || "(sin nombre)"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={r.gender}
                          onChange={(e) => updateRow(r.id, { gender: e.target.value as Gender })}
                          className={`${inputClass} w-28`}
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
                          min={0}
                          step="0.01"
                          value={r.feeUsd}
                          onChange={(e) => updateRow(r.id, { feeUsd: e.target.value })}
                          className={`${inputClass} w-24`}
                          placeholder="Hereda"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={1}
                          value={r.maxTeams}
                          onChange={(e) => updateRow(r.id, { maxTeams: e.target.value })}
                          className={`${inputClass} w-20`}
                          placeholder="∞"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={r.customLabel}
                          onChange={(e) => updateRow(r.id, { customLabel: e.target.value })}
                          className={`${inputClass} w-36`}
                          placeholder="Opcional"
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateRow(r.id, { editing: false })}
                            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                            aria-label="Listo"
                            title="Listo"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setRows((all) => all.filter((row) => row.id !== r.id))}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Eliminar categoría"
                            title="Eliminar"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-3 font-medium text-zinc-900">{r.ageLabel || "—"}</td>
                      <td className="py-3 pr-3 text-zinc-500">{divisionLabel(r.divisionId)}</td>
                      <td className="py-3 pr-3 text-zinc-500">{GENDER_LABELS[r.gender]}</td>
                      <td className="py-3 pr-3 text-zinc-500">
                        {r.feeUsd.trim() ? (
                          formatUsd(parseUsdToCents(r.feeUsd))
                        ) : (
                          <span className="text-zinc-400">Hereda</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-zinc-500">
                        {r.maxTeams.trim() || <span className="text-zinc-400">Sin límite</span>}
                      </td>
                      <td className="py-3 pr-3 text-zinc-500">
                        {r.customLabel.trim() || <span className="text-zinc-400">—</span>}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateRow(r.id, { editing: true })}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600"
                            aria-label="Editar categoría"
                            title="Editar"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRows((all) => all.filter((row) => row.id !== r.id))}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Eliminar categoría"
                            title="Eliminar"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <div className="mt-6 flex justify-end border-t border-zinc-100 pt-5">
          <button type="button" onClick={save} className={btnPrimary} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
        <p className="mt-2 text-right text-xs text-zinc-400">
          Los cambios se aplican al guardar; la tarifa vacía hereda la tarifa base (
          {formatUsd(tournament.baseFeeCents)}).
        </p>
      </div>
    </div>
  );
}
