"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { appendStoredTournament, readStoredTournaments } from "@/lib/local-tournaments";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import type { CategoryMock, TournamentMock } from "@/lib/mock-data";
import { tournaments as seedTournaments } from "@/lib/mock-data";
import { slugify } from "@/lib/slugify";
const PROMO_MAX_BYTES = 400 * 1024;

type SubdivisionFormRow = {
  key: string;
  label: string;
};

type CategoryFormRow = {
  key: string;
  label: string;
  feeUsd: string;
  maxTeams: string;
  subdivisions: SubdivisionFormRow[];
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [registrationDeadlineOn, setRegistrationDeadlineOn] = useState("");
  const [tournamentStartsOn, setTournamentStartsOn] = useState("");
  const [tournamentEndsOn, setTournamentEndsOn] = useState("");
  const [registrationFeeBaseUsd, setRegistrationFeeBaseUsd] = useState("");
  const [publicEntryFeeUsd, setPublicEntryFeeUsd] = useState("");
  const [promoImageDataUrl, setPromoImageDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<TournamentMock["status"]>("draft");

  const [categories, setCategories] = useState<CategoryFormRow[]>([
    {
      key: crypto.randomUUID(),
      label: "",
      feeUsd: "",
      maxTeams: "",
      subdivisions: [],
    },
  ]);

  const [error, setError] = useState<string | null>(null);

  function addCategory() {
    setCategories((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        label: "",
        feeUsd: "",
        maxTeams: "",
        subdivisions: [],
      },
    ]);
  }

  function removeCategory(key: string) {
    setCategories((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
  }

  function updateCategory(key: string, patch: Partial<CategoryFormRow>) {
    setCategories((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function addSubdivision(catKey: string) {
    setCategories((rows) =>
      rows.map((r) =>
        r.key === catKey
          ? {
              ...r,
              subdivisions: [
                ...r.subdivisions,
                { key: crypto.randomUUID(), label: "" },
              ],
            }
          : r,
      ),
    );
  }

  function removeSubdivision(catKey: string, subKey: string) {
    setCategories((rows) =>
      rows.map((r) =>
        r.key === catKey
          ? {
              ...r,
              subdivisions: r.subdivisions.filter((s) => s.key !== subKey),
            }
          : r,
      ),
    );
  }

  function updateSubdivision(catKey: string, subKey: string, label: string) {
    setCategories((rows) =>
      rows.map((r) =>
        r.key === catKey
          ? {
              ...r,
              subdivisions: r.subdivisions.map((s) =>
                s.key === subKey ? { ...s, label } : s,
              ),
            }
          : r,
      ),
    );
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

    const registrationFeeCents = parseFeeToCents(registrationFeeBaseUsd);
    if (registrationFeeBaseUsd.trim() && registrationFeeCents === null) {
      setError("Tarifa base de inscripción inválida.");
      return;
    }
    const base = registrationFeeBaseUsd.trim() ? registrationFeeCents : null;

    const publicEntryParsed = parseFeeToCents(publicEntryFeeUsd);
    if (publicEntryFeeUsd.trim() && publicEntryParsed === null) {
      setError("Costo de entrada al público inválido.");
      return;
    }
    const publicEntryFeeCents = publicEntryFeeUsd.trim() ? publicEntryParsed : null;

    const categoryPayload: CategoryMock[] = [];

    for (let i = 0; i < categories.length; i++) {
      const row = categories[i];
      if (!row.label.trim()) {
        setError(`Categoría ${i + 1}: indica un nombre.`);
        return;
      }

      let catFee: number | null = null;
      if (row.feeUsd.trim()) {
        const c = parseFeeToCents(row.feeUsd.trim());
        if (c === null) {
          setError(`Categoría ${i + 1}: tarifa inválida.`);
          return;
        }
        catFee = c;
      }

      if (catFee === null && base === null) {
        setError(
          `Categoría ${i + 1}: indica tarifa en la categoría o define una tarifa base del torneo.`,
        );
        return;
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

      const subs: { id: string; label: string }[] = [];
      for (let j = 0; j < row.subdivisions.length; j++) {
        const sub = row.subdivisions[j];
        const lab = sub.label.trim();
        if (!lab) {
          setError(`Categoría ${i + 1}, subdivisión ${j + 1}: indica etiqueta o quítala.`);
          return;
        }
        subs.push({ id: `local-sub-${crypto.randomUUID()}`, label: lab });
      }

      categoryPayload.push({
        id: `local-cat-${crypto.randomUUID()}`,
        label: row.label.trim(),
        feeCents: catFee,
        maxTeams,
        subdivisions: subs,
      });
    }

    const mergedForSlug = mergeAdminTournaments(
      seedTournaments,
      readStoredTournaments(),
    );
    const takenSlugs = new Set(mergedForSlug.map((t) => t.slug));
    const slug = uniqueSlug(name, takenSlugs);

    const tournament: TournamentMock = {
      slug,
      name: name.trim(),
      description: description.trim() || "Sin descripción.",
      locationLabel: locationLabel.trim() || "Por definir",
      registrationDeadlineOn,
      tournamentStartsOn,
      tournamentEndsOn,
      registrationFeeCents: base,
      publicEntryFeeCents,
      promoImageDataUrl,
      status,
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
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Costo inscripción base (USD, opcional)
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">
              Las categorías pueden dejar su tarifa vacía para usar esta base.
            </p>
            <input
              inputMode="decimal"
              placeholder="Ej. 250"
              value={registrationFeeBaseUsd}
              onChange={(e) => setRegistrationFeeBaseUsd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
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
          {categories.map((row, idx) => (
            <li
              key={row.key}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Categoría {idx + 1}
                </span>
                {categories.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeCategory(row.key)}
                    className="text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    Quitar categoría
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Nombre de la categoría
                  </label>
                  <input
                    value={row.label}
                    onChange={(e) =>
                      updateCategory(row.key, { label: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Tarifa inscripción (USD, opcional si hay base)
                  </label>
                  <input
                    inputMode="decimal"
                    placeholder="250"
                    value={row.feeUsd}
                    onChange={(e) =>
                      updateCategory(row.key, { feeUsd: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
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

              <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Divisiones dentro de esta categoría (opcional)
                  </span>
                  <button
                    type="button"
                    onClick={() => addSubdivision(row.key)}
                    className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    + Añadir subdivisión
                  </button>
                </div>
                {row.subdivisions.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Sin subdivisión: la categoría es una sola lista de equipos.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {row.subdivisions.map((sub, sidx) => (
                      <li key={sub.key} className="flex gap-2">
                        <input
                          placeholder={`Etiqueta subdivisión ${sidx + 1}`}
                          value={sub.label}
                          onChange={(e) =>
                            updateSubdivision(row.key, sub.key, e.target.value)
                          }
                          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                        />
                        <button
                          type="button"
                          onClick={() => removeSubdivision(row.key, sub.key)}
                          className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
