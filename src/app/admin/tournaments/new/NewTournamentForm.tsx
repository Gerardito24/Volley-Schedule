"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { appendStoredTournament, readStoredTournaments } from "@/lib/local-tournaments";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import type { CategoryGender, CategoryMock, TournamentMock } from "@/lib/mock-data";
import { buildDefaultCategoryLabel, tournaments as seedTournaments } from "@/lib/mock-data";
import { slugify } from "@/lib/slugify";
const PROMO_MAX_BYTES = 400 * 1024;

const AGE_SUGGESTIONS = ["10U", "12U", "14U", "16U", "18U", "Open"];

type DivisionFormRow = {
  key: string;
  label: string;
};

type CategoryFormRow = {
  key: string;
  ageLabel: string;
  divisionId: string;
  gender: CategoryGender;
  /** Título mostrado; si `labelManual` es false, se iguala al auto desde edad+división+género. */
  label: string;
  labelManual: boolean;
  feeUsd: string;
  maxTeams: string;
};

function uniqueSlug(base: string, taken: Set<string>): string {
  let s = slugify(base);
  if (!taken.has(s)) return s;
  let n = 2;
  while (taken.has(`${s}-${n}`)) n += 1;
  return `${s}-${n}`;
}

function parseFeeToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed.replace(",", "."));
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** ISO date strings YYYY-MM-DD compare lexicographically. */
function dateOrderOk(a: string, b: string): boolean {
  return a <= b;
}

export function NewTournamentForm() {
  const router = useRouter();
  const promoInputRef = useRef<HTMLInputElement>(null);

  const initialFirstDivision = useMemo(
    () => ({ key: crypto.randomUUID(), label: "" }),
    [],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [registrationDeadlineOn, setRegistrationDeadlineOn] = useState("");
  const [tournamentStartsOn, setTournamentStartsOn] = useState("");
  const [tournamentEndsOn, setTournamentEndsOn] = useState("");
  const [registrationFeeBaseUsd, setRegistrationFeeBaseUsd] = useState("");
  /** Si es true, cada categoría debe tener su propia tarifa (no usa solo la base). */
  const [allowPerCategoryFees, setAllowPerCategoryFees] = useState(false);
  const [publicEntryFeeUsd, setPublicEntryFeeUsd] = useState("");
  const [promoImageDataUrl, setPromoImageDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<TournamentMock["status"]>("draft");

  const [tournamentDivisions, setTournamentDivisions] = useState<DivisionFormRow[]>([
    initialFirstDivision,
  ]);

  const [categories, setCategories] = useState<CategoryFormRow[]>([
    {
      key: crypto.randomUUID(),
      ageLabel: "",
      divisionId: initialFirstDivision.key,
      gender: "mixto",
      label: buildDefaultCategoryLabel("", initialFirstDivision.key, [
        { id: initialFirstDivision.key, label: initialFirstDivision.label },
      ], "mixto"),
      labelManual: false,
      feeUsd: "",
      maxTeams: "",
    },
  ]);

  const [editingTitleKey, setEditingTitleKey] = useState<string | null>(null);
  const [titleEditDraft, setTitleEditDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function divisionPairs() {
    return tournamentDivisions.map((d) => ({ id: d.key, label: d.label }));
  }

  function addDivision() {
    setTournamentDivisions((rows) => [...rows, { key: crypto.randomUUID(), label: "" }]);
  }

  function removeDivision(divKey: string) {
    setTournamentDivisions((rows) => {
      if (rows.length <= 1) return rows;
      const next = rows.filter((r) => r.key !== divKey);
      const fallback = next[0]!.key;
      const divs = next.map((d) => ({ id: d.key, label: d.label }));
      setCategories((cats) =>
        cats.map((c) => {
          let divisionId = c.divisionId === divKey ? fallback : c.divisionId;
          if (!next.some((r) => r.key === divisionId)) divisionId = fallback;
          const base = { ...c, divisionId };
          if (base.labelManual) return base;
          return {
            ...base,
            label: buildDefaultCategoryLabel(base.ageLabel, divisionId, divs, base.gender),
          };
        }),
      );
      return next;
    });
  }

  function updateDivisionRow(divKey: string, label: string) {
    setTournamentDivisions((rows) => {
      const next = rows.map((r) => (r.key === divKey ? { ...r, label } : r));
      const divs = next.map((d) => ({ id: d.key, label: d.label }));
      setCategories((cats) =>
        cats.map((c) =>
          c.labelManual
            ? c
            : {
                ...c,
                label: buildDefaultCategoryLabel(c.ageLabel, c.divisionId, divs, c.gender),
              },
        ),
      );
      return next;
    });
  }

  function addCategory() {
    const firstId = tournamentDivisions[0]?.key ?? "";
    const divs = divisionPairs();
    setCategories((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        ageLabel: "",
        divisionId: firstId,
        gender: "mixto",
        label: buildDefaultCategoryLabel("", firstId, divs, "mixto"),
        labelManual: false,
        feeUsd: "",
        maxTeams: "",
      },
    ]);
  }

  function removeCategory(key: string) {
    if (editingTitleKey === key) setEditingTitleKey(null);
    setCategories((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
  }

  function categoryDisplayTitle(row: CategoryFormRow): string {
    const divs = divisionPairs();
    if (row.labelManual && row.label.trim()) return row.label.trim();
    return buildDefaultCategoryLabel(row.ageLabel, row.divisionId, divs, row.gender);
  }

  function startTitleEdit(row: CategoryFormRow) {
    setEditingTitleKey(row.key);
    setTitleEditDraft(categoryDisplayTitle(row));
  }

  function commitTitleEdit(row: CategoryFormRow) {
    const divs = divisionPairs();
    const auto = buildDefaultCategoryLabel(row.ageLabel, row.divisionId, divs, row.gender);
    const draft = titleEditDraft.trim();
    if (!draft || draft === auto) {
      updateCategory(row.key, { label: auto, labelManual: false });
    } else {
      updateCategory(row.key, { label: draft, labelManual: true });
    }
    setEditingTitleKey(null);
  }

  function updateCategory(key: string, patch: Partial<CategoryFormRow>) {
    setCategories((rows) => {
      const divs = divisionPairs();
      return rows.map((r) => {
        if (r.key !== key) return r;
        let next = { ...r, ...patch };
        const affectsAuto =
          "ageLabel" in patch || "divisionId" in patch || "gender" in patch;
        if (affectsAuto && !next.labelManual) {
          next = {
            ...next,
            label: buildDefaultCategoryLabel(
              next.ageLabel,
              next.divisionId,
              divs,
              next.gender,
            ),
          };
        }
        return next;
      });
    });
  }

  function onPromoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      e.target.value = "";
      return;
    }
    if (file.size > PROMO_MAX_BYTES) {
      setError(`La imagen supera ${PROMO_MAX_BYTES / 1024} KB. Elige una más liviana para localStorage.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setPromoImageDataUrl(result);
    };
    reader.readAsDataURL(file);
    setError(null);
  }

  function clearPromo() {
    setPromoImageDataUrl(null);
    if (promoInputRef.current) promoInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre del torneo es obligatorio.");
      return;
    }
    if (!registrationDeadlineOn || !tournamentStartsOn || !tournamentEndsOn) {
      setError("Completa las tres fechas.");
      return;
    }
    if (!dateOrderOk(registrationDeadlineOn, tournamentStartsOn)) {
      setError("La fecha límite de inscripción debe ser anterior o igual al primer día del torneo.");
      return;
    }
    if (!dateOrderOk(tournamentStartsOn, tournamentEndsOn)) {
      setError("El primer día del torneo debe ser anterior o igual al último día.");
      return;
    }

    if (!registrationFeeBaseUsd.trim()) {
      setError("El costo de inscripción base es obligatorio.");
      return;
    }
    const registrationFeeCents = parseFeeToCents(registrationFeeBaseUsd);
    if (registrationFeeCents === null) {
      setError("Tarifa base de inscripción inválida.");
      return;
    }
    const base = registrationFeeCents;

    const publicEntryParsed = parseFeeToCents(publicEntryFeeUsd);
    if (publicEntryFeeUsd.trim() && publicEntryParsed === null) {
      setError("Costo de entrada al público inválido.");
      return;
    }
    const publicEntryFeeCents = publicEntryFeeUsd.trim() ? publicEntryParsed : null;

    const divisionsPayload = tournamentDivisions
      .map((r) => ({ id: r.key, label: r.label.trim() }))
      .filter((d) => d.label.length > 0);
    if (divisionsPayload.length === 0) {
      setError("Agrega al menos una división del torneo (sección Divisiones del torneo).");
      return;
    }
    const divisionIds = new Set(divisionsPayload.map((d) => d.id));

    const categoryPayload: CategoryMock[] = [];

    for (let i = 0; i < categories.length; i++) {
      const row = categories[i];
      if (!row.ageLabel.trim()) {
        setError(`Categoría ${i + 1}: indica la edad (ej. 14U) o elegí una sugerencia.`);
        return;
      }
      if (!row.divisionId || !divisionIds.has(row.divisionId)) {
        setError(`Categoría ${i + 1}: elegí una división del torneo.`);
        return;
      }

      let catFee: number | null = null;
      if (allowPerCategoryFees) {
        if (!row.feeUsd.trim()) {
          setError(`Categoría ${i + 1}: indica la tarifa de inscripción de esta categoría.`);
          return;
        }
        const c = parseFeeToCents(row.feeUsd.trim());
        if (c === null) {
          setError(`Categoría ${i + 1}: tarifa inválida.`);
          return;
        }
        catFee = c;
      }

      let maxTeams: number | null = null;
      if (row.maxTeams.trim()) {
        const m = Number.parseInt(row.maxTeams.trim(), 10);
        if (Number.isNaN(m) || m < 1) {
          setError(`Categoría ${i + 1}: cupo máximo inválido.`);
          return;
        }
        maxTeams = m;
      }

      const autoLabel = buildDefaultCategoryLabel(
        row.ageLabel,
        row.divisionId,
        divisionsPayload,
        row.gender,
      );
      const finalLabel =
        row.labelManual && row.label.trim() ? row.label.trim() : autoLabel;

      categoryPayload.push({
        id: `local-cat-${crypto.randomUUID()}`,
        label: finalLabel,
        ageLabel: row.ageLabel.trim(),
        divisionId: row.divisionId,
        gender: row.gender,
        categoryTitleManual: row.labelManual,
        feeCents: catFee,
        maxTeams,
        subdivisions: [],
      });
    }

    const mergedForSlug = mergeAdminTournaments(
      seedTournaments,
      readStoredTournaments(),
    );
    const takenSlugs = new Set(mergedForSlug.map((t) => t.slug));
    const slug = uniqueSlug(name, takenSlugs);

    const loc = locationLabel.trim() || "Por definir";
    const tournament: TournamentMock = {
      slug,
      name: name.trim(),
      description: description.trim() || "Sin descripción.",
      locationLabel: loc,
      venues: [{ label: loc, courtCount: null }],
      registrationDeadlineOn,
      tournamentStartsOn,
      tournamentEndsOn,
      registrationFeeCents: base,
      publicEntryFeeCents,
      promoImageDataUrl,
      status,
      divisions: divisionsPayload,
      categories: categoryPayload,
    };

    appendStoredTournament(tournament);
    router.push(`/admin/tournaments/${encodeURIComponent(slug)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Nombre del torneo
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Ubicación (texto corto)
          </label>
          <input
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Fecha límite inscripción
            </label>
            <input
              type="date"
              required
              value={registrationDeadlineOn}
              onChange={(e) => setRegistrationDeadlineOn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Primer día del torneo
            </label>
            <input
              type="date"
              required
              value={tournamentStartsOn}
              onChange={(e) => setTournamentStartsOn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Último día del torneo
            </label>
            <input
              type="date"
              required
              value={tournamentEndsOn}
              onChange={(e) => setTournamentEndsOn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Costo inscripción base (USD)
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">
              Tarifa por defecto del torneo. Activa la opción de abajo solo si alguna categoría cobrará distinto.
            </p>
            <input
              required
              inputMode="decimal"
              placeholder="Ej. 250"
              value={registrationFeeBaseUsd}
              onChange={(e) => setRegistrationFeeBaseUsd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={allowPerCategoryFees}
                onChange={(e) => {
                  const on = e.target.checked;
                  setAllowPerCategoryFees(on);
                  if (!on) {
                    setCategories((rows) =>
                      rows.map((r) => ({ ...r, feeUsd: "" })),
                    );
                  }
                }}
                className="mt-0.5 rounded border-zinc-300"
              />
              <span>
                Definir tarifa de inscripción distinta por categoría (si no está marcado, todas usan la base).
              </span>
            </label>
          </div>
          <div className="sm:col-span-2 sm:max-w-md">
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Entrada público al torneo (USD, opcional)
            </label>
            <input
              inputMode="decimal"
              placeholder="Ej. 6"
              value={publicEntryFeeUsd}
              onChange={(e) => setPublicEntryFeeUsd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Imagen promocional
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            Máx. {PROMO_MAX_BYTES / 1024} KB (localStorage). Formatos imagen habituales.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              ref={promoInputRef}
              type="file"
              accept="image/*"
              onChange={onPromoChange}
              className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:file:border-zinc-600 dark:file:bg-zinc-900"
            />
            {promoImageDataUrl ? (
              <button
                type="button"
                onClick={clearPromo}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Quitar imagen
              </button>
            ) : null}
          </div>
          {promoImageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={promoImageDataUrl}
              alt="Vista previa promo"
              className="mt-3 max-h-40 rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
            />
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Estado del torneo
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as TournamentMock["status"])
            }
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="draft">Borrador</option>
            <option value="open">Abierto</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Divisiones del torneo
          </h3>
          <button
            type="button"
            onClick={addDivision}
            className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            + Añadir división
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Definí primero las divisiones (ej. Oro, Plata, Open). Cada categoría elige una de esta lista; el género es aparte.
        </p>
        <ul className="space-y-2">
          {tournamentDivisions.map((div, didx) => (
            <li
              key={div.key}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
            >
              <span className="w-8 shrink-0 text-xs font-medium text-zinc-400">
                {didx + 1}.
              </span>
              <input
                type="text"
                value={div.label}
                onChange={(e) => updateDivisionRow(div.key, e.target.value)}
                placeholder="Nombre de la división"
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
              {tournamentDivisions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeDivision(div.key)}
                  className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Categorías
          </h3>
          <button
            type="button"
            onClick={addCategory}
            className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            + Añadir categoría
          </button>
        </div>
        <ul className="space-y-4">
          {categories.map((row) => (
            <li
              key={row.key}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {editingTitleKey === row.key ? (
                    <input
                      type="text"
                      autoFocus
                      value={titleEditDraft}
                      onChange={(e) => setTitleEditDraft(e.target.value)}
                      onBlur={() => commitTitleEdit(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                        if (e.key === "Escape") {
                          setEditingTitleKey(null);
                        }
                      }}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-semibold text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  ) : (
                    <button
                      type="button"
                      title="Doble clic para editar el nombre (no cambia edad, división ni género)"
                      onDoubleClick={() => startTitleEdit(row)}
                      className="block w-full truncate text-left text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                    >
                      {categoryDisplayTitle(row)}
                    </button>
                  )}
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Nombre = edad + división + género. Doble clic para un nombre distinto.
                  </p>
                </div>
                {categories.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeCategory(row.key)}
                    className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    Quitar categoría
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Edad
                  </label>
                  <input
                    list={`age-dl-${row.key}`}
                    value={row.ageLabel}
                    onChange={(e) =>
                      updateCategory(row.key, { ageLabel: e.target.value })
                    }
                    placeholder="Ej. 14U"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  />
                  <datalist id={`age-dl-${row.key}`}>
                    {AGE_SUGGESTIONS.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    División del torneo (grupo)
                  </label>
                  <select
                    value={row.divisionId}
                    onChange={(e) =>
                      updateCategory(row.key, { divisionId: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    {tournamentDivisions.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label.trim() || "(sin nombre aún)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Género
                  </label>
                  <select
                    value={row.gender}
                    onChange={(e) =>
                      updateCategory(row.key, {
                        gender: e.target.value as CategoryGender,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {allowPerCategoryFees
                      ? "Tarifa inscripción categoría (USD)"
                      : "Tarifa inscripción (usa la tarifa base)"}
                  </label>
                  <input
                    inputMode="decimal"
                    placeholder={allowPerCategoryFees ? "Ej. 275" : "—"}
                    value={row.feeUsd}
                    disabled={!allowPerCategoryFees}
                    onChange={(e) =>
                      updateCategory(row.key, { feeUsd: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Cupo máx. equipos (opcional)
                  </label>
                  <input
                    inputMode="numeric"
                    placeholder="16"
                    value={row.maxTeams}
                    onChange={(e) =>
                      updateCategory(row.key, { maxTeams: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Guardar torneo
        </button>
        <Link
          href="/admin/tournaments"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
