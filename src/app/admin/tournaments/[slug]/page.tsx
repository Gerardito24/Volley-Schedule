"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { TournamentSchedulePanel } from "@/components/admin/TournamentSchedulePanel";
import { MergedRegistrationsTable } from "@/components/MergedRegistrationsTable";
import {
  readStoredTournaments,
  upsertStoredTournament,
} from "@/lib/local-tournaments";
import {
  readStoredRegistrations,
  upsertStoredRegistration,
} from "@/lib/local-registrations";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import type { CategoryMock, TournamentMock, TournamentVenue } from "@/lib/mock-data";
import {
  registrationRows as seedRegistrationRows,
  tournaments as seedTournaments,
  formatTournamentLocationsLine,
  normalizeTournament,
} from "@/lib/mock-data";
import { effectiveCategoryFeeCents } from "@/lib/tournament-pricing";

const statusLabel: Record<TournamentMock["status"], string> = {
  open: "Abierto",
  closed: "Cerrado",
  draft: "Borrador",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function dollarsToCents(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function centsToInput(c: number | null): string {
  if (c == null) return "";
  return (c / 100).toFixed(2);
}

type VenueRowDraft = { label: string; courtCountInput: string };

type GeneralDraft = {
  name: string;
  description: string;
  venueRows: VenueRowDraft[];
  registrationDeadlineOn: string;
  tournamentStartsOn: string;
  tournamentEndsOn: string;
  status: TournamentMock["status"];
  registrationFeeInput: string;
  publicEntryFeeInput: string;
};

function parseCourtCountInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function tournamentToGeneralDraft(t: TournamentMock): GeneralDraft {
  const nt = normalizeTournament(t);
  const venueRows: VenueRowDraft[] =
    nt.venues.length > 0
      ? nt.venues.map((v) => ({
          label: v.label,
          courtCountInput: v.courtCount != null ? String(v.courtCount) : "",
        }))
      : [{ label: "", courtCountInput: "" }];
  return {
    name: nt.name,
    description: nt.description,
    venueRows,
    registrationDeadlineOn: nt.registrationDeadlineOn,
    tournamentStartsOn: nt.tournamentStartsOn,
    tournamentEndsOn: nt.tournamentEndsOn,
    status: nt.status,
    registrationFeeInput: centsToInput(nt.registrationFeeCents),
    publicEntryFeeInput: centsToInput(nt.publicEntryFeeCents),
  };
}

function categoryToDraft(c: CategoryMock) {
  return {
    label: c.label,
    feeInput: centsToInput(c.feeCents),
    maxTeamsInput: c.maxTeams != null ? String(c.maxTeams) : "",
  };
}

function AdminTournamentDetailInner() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slugParam = params.slug;
  const slug =
    typeof slugParam === "string"
      ? decodeURIComponent(slugParam)
      : Array.isArray(slugParam)
        ? decodeURIComponent(slugParam[0] ?? "")
        : "";

  const selectedCategoryId = searchParams.get("category");

  const [merged, setMerged] = useState<TournamentMock[]>(() =>
    mergeAdminTournaments(seedTournaments, readStoredTournaments()),
  );

  const refreshMerged = useCallback(() => {
    setMerged(mergeAdminTournaments(seedTournaments, readStoredTournaments()));
  }, []);

  useEffect(() => {
    refreshMerged();
  }, [slug, refreshMerged]);

  const tournament = useMemo(
    () => merged.find((t) => t.slug === slug),
    [merged, slug],
  );

  const [generalDraft, setGeneralDraft] = useState<GeneralDraft | null>(null);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<{
    label: string;
    feeInput: string;
    maxTeamsInput: string;
  } | null>(null);
  const [categorySaved, setCategorySaved] = useState(false);

  useEffect(() => {
    if (!tournament) {
      setGeneralDraft(null);
      return;
    }
    setGeneralDraft(tournamentToGeneralDraft(tournament));
  }, [tournament]);

  const selectedCategory = useMemo(() => {
    if (!tournament || !selectedCategoryId) return null;
    return tournament.categories.find((c) => c.id === selectedCategoryId) ?? null;
  }, [tournament, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryDraft(null);
      return;
    }
    setCategoryDraft(categoryToDraft(selectedCategory));
  }, [selectedCategory]);

  const setCategoryQuery = useCallback(
    (categoryId: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (categoryId) p.set("category", categoryId);
      else p.delete("category");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const persistTournament = useCallback(
    (next: TournamentMock) => {
      upsertStoredTournament(next);
      refreshMerged();
    },
    [refreshMerged],
  );

  const handleSaveGeneral = useCallback(() => {
    if (!tournament || !generalDraft) return;
    const parsedRows = generalDraft.venueRows.map((row) => ({
      label: row.label.trim(),
      courtCount: parseCourtCountInput(row.courtCountInput),
    }));
    const nonEmpty = parsedRows.filter((r) => r.label.length > 0);
    const venues: TournamentVenue[] =
      nonEmpty.length > 0
        ? nonEmpty
        : [
            {
              label: tournament.locationLabel.trim() || "Por definir",
              courtCount: null,
            },
          ];
    const next = normalizeTournament({
      ...tournament,
      name: generalDraft.name.trim() || tournament.name,
      description: generalDraft.description,
      venues,
      locationLabel: venues.map((v) => v.label).join(" · "),
      registrationDeadlineOn: generalDraft.registrationDeadlineOn,
      tournamentStartsOn: generalDraft.tournamentStartsOn,
      tournamentEndsOn: generalDraft.tournamentEndsOn,
      status: generalDraft.status,
      registrationFeeCents: dollarsToCents(generalDraft.registrationFeeInput),
      publicEntryFeeCents: dollarsToCents(generalDraft.publicEntryFeeInput),
    });
    persistTournament(next);
    setGeneralSaved(true);
    window.setTimeout(() => setGeneralSaved(false), 2000);
  }, [generalDraft, persistTournament, tournament]);

  const syncDivisionLabels = useCallback(
    (categoryId: string, newLabel: string) => {
      const mergedRows = mergeAdminRegistrations(
        seedRegistrationRows,
        readStoredRegistrations(),
      );
      for (const r of mergedRows) {
        if (r.tournamentSlug !== slug || r.categoryId !== categoryId) continue;
        if (r.divisionLabel === newLabel) continue;
        upsertStoredRegistration({ ...r, divisionLabel: newLabel });
      }
    },
    [slug],
  );

  const handleSaveCategory = useCallback(() => {
    if (!tournament || !selectedCategory || !categoryDraft) return;
    const feeParsed = dollarsToCents(categoryDraft.feeInput);
    const maxRaw = categoryDraft.maxTeamsInput.trim();
    let nextMax: number | null;
    if (maxRaw === "") {
      nextMax = null;
    } else {
      const n = Number.parseInt(maxRaw, 10);
      nextMax =
        !Number.isNaN(n) && n >= 0 ? n : selectedCategory.maxTeams;
    }

    const newLabel = categoryDraft.label.trim() || selectedCategory.label;
    const feeTrim = categoryDraft.feeInput.trim();
    const nextFeeCents =
      feeTrim === "" ? null : (feeParsed ?? selectedCategory.feeCents);
    const nextCategories = tournament.categories.map((c) =>
      c.id === selectedCategory.id
        ? {
            ...c,
            label: newLabel,
            feeCents: nextFeeCents,
            maxTeams: nextMax,
          }
        : c,
    );

    const next: TournamentMock = { ...tournament, categories: nextCategories };
    persistTournament(next);
    if (newLabel !== selectedCategory.label) {
      syncDivisionLabels(selectedCategory.id, newLabel);
    }
    setCategorySaved(true);
    window.setTimeout(() => setCategorySaved(false), 2000);
  }, [
    categoryDraft,
    persistTournament,
    selectedCategory,
    syncDivisionLabels,
    tournament,
  ]);

  if (!slug) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enlace inválido.
        </p>
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Volver a torneos
        </Link>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Torneo no encontrado
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No hay torneo con slug{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">{slug}</code>
          . Puede haberse borrado el almacenamiento local del navegador.
        </p>
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Volver a torneos
        </Link>
      </main>
    );
  }

  if (selectedCategoryId && !selectedCategory) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Torneos
        </Link>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Categoría no encontrada.
        </p>
        <button
          type="button"
          onClick={() => setCategoryQuery(null)}
          className="w-fit text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Volver al torneo
        </button>
      </main>
    );
  }

  if (selectedCategory && categoryDraft) {
    return (
      <main className="flex flex-1 flex-col gap-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setCategoryQuery(null)}
            className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            ← Volver al torneo
          </button>
          <span className="text-zinc-400">·</span>
          <Link
            href="/admin/tournaments"
            className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Lista de torneos
          </Link>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Categoría: {selectedCategory.label}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Editá nombre, tarifa y cupo. Los cambios se guardan en este navegador
            (localStorage).
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Nombre
              </span>
              <input
                type="text"
                value={categoryDraft.label}
                onChange={(e) =>
                  setCategoryDraft((d) =>
                    d ? { ...d, label: e.target.value } : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Tarifa (USD)
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="ej. 250.00"
                value={categoryDraft.feeInput}
                onChange={(e) =>
                  setCategoryDraft((d) =>
                    d ? { ...d, feeInput: e.target.value } : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Máximo de equipos (vacío = sin límite)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={categoryDraft.maxTeamsInput}
                onChange={(e) =>
                  setCategoryDraft((d) =>
                    d ? { ...d, maxTeamsInput: e.target.value } : d,
                  )
                }
                className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveCategory}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Guardar categoría
            </button>
            {categorySaved ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">
                Guardado.
              </span>
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Inscripciones — {selectedCategory.label}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Solo equipos inscritos en esta categoría.
          </p>
          <div className="mt-6">
            <MergedRegistrationsTable
              tournamentSlug={slug}
              categoryId={selectedCategory.id}
              hideTournamentColumn
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-10">
      <div>
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Torneos
        </Link>

        {generalDraft ? (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Datos del torneo
              </h2>
              <label className="text-sm">
                <span className="mr-2 font-medium text-zinc-600 dark:text-zinc-400">
                  Estado
                </span>
                <select
                  value={generalDraft.status}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d
                        ? {
                            ...d,
                            status: e.target.value as TournamentMock["status"],
                          }
                        : d,
                    )
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="open">Abierto</option>
                  <option value="closed">Cerrado</option>
                  <option value="draft">Borrador</option>
                </select>
              </label>
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              slug (solo lectura): {tournament.slug}
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <label className="block text-sm lg:col-span-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre
                </span>
                <input
                  type="text"
                  value={generalDraft.name}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d ? { ...d, name: e.target.value } : d,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Inicio del torneo
                </span>
                <input
                  type="date"
                  value={generalDraft.tournamentStartsOn}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d ? { ...d, tournamentStartsOn: e.target.value } : d,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Fin del torneo
                </span>
                <input
                  type="date"
                  value={generalDraft.tournamentEndsOn}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d ? { ...d, tournamentEndsOn: e.target.value } : d,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Límite inscripciones
                </span>
                <input
                  type="date"
                  value={generalDraft.registrationDeadlineOn}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d
                        ? { ...d, registrationDeadlineOn: e.target.value }
                        : d,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <div className="relative lg:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Ubicaciones y canchas
                  </span>
                  <button
                    type="button"
                    title="Agregar sede"
                    onClick={() =>
                      setGeneralDraft((d) =>
                        d
                          ? {
                              ...d,
                              venueRows: [
                                ...d.venueRows,
                                { label: "", courtCountInput: "" },
                              ],
                            }
                          : d,
                      )
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white text-lg font-semibold leading-none text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    +
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Cada sede tiene su propia cantidad de canchas.
                </p>
                <div className="mt-2 space-y-2">
                  {generalDraft.venueRows.map((row, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) =>
                          setGeneralDraft((d) => {
                            if (!d) return d;
                            const next = [...d.venueRows];
                            next[idx] = { ...next[idx], label: e.target.value };
                            return { ...d, venueRows: next };
                          })
                        }
                        placeholder={`Ubicación ${idx + 1}`}
                        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={row.courtCountInput}
                        onChange={(e) =>
                          setGeneralDraft((d) => {
                            if (!d) return d;
                            const next = [...d.venueRows];
                            next[idx] = {
                              ...next[idx],
                              courtCountInput: e.target.value,
                            };
                            return { ...d, venueRows: next };
                          })
                        }
                        placeholder="Canchas"
                        className="w-24 shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                      {generalDraft.venueRows.length > 1 ? (
                        <button
                          type="button"
                          title="Quitar"
                          onClick={() =>
                            setGeneralDraft((d) => {
                              if (!d || d.venueRows.length <= 1) return d;
                              return {
                                ...d,
                                venueRows: d.venueRows.filter((_, i) => i !== idx),
                              };
                            })
                          }
                          className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-2 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <label className="block text-sm lg:col-span-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Descripción
                </span>
                <textarea
                  rows={3}
                  value={generalDraft.description}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d ? { ...d, description: e.target.value } : d,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Tarifa base inscripción (USD, vacío = sin tarifa base)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={generalDraft.registrationFeeInput}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d ? { ...d, registrationFeeInput: e.target.value } : d,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Entrada público (USD)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={generalDraft.publicEntryFeeInput}
                  onChange={(e) =>
                    setGeneralDraft((d) =>
                      d ? { ...d, publicEntryFeeInput: e.target.value } : d,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveGeneral}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Guardar datos del torneo
              </button>
              {generalSaved ? (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  Guardado.
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {tournament.name}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Torneo: {tournament.tournamentStartsOn} — {tournament.tournamentEndsOn}{" "}
              · {formatTournamentLocationsLine(tournament)}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Límite inscripciones: {tournament.registrationDeadlineOn}
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {statusLabel[tournament.status]}
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {tournament.description}
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tarifa base inscripción
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {tournament.registrationFeeCents != null
                ? formatMoney(tournament.registrationFeeCents)
                : "—"}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Entrada público
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {tournament.publicEntryFeeCents != null
                ? formatMoney(tournament.publicEntryFeeCents)
                : "—"}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Canchas por sede
            </dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <ul className="list-none space-y-0.5 font-normal">
                {normalizeTournament(tournament).venues.map((v, i) => (
                  <li key={i}>
                    {v.label}: {v.courtCount != null ? v.courtCount : "—"}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        {tournament.promoImageDataUrl ? (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Imagen promo
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tournament.promoImageDataUrl}
              alt=""
              className="mt-2 max-h-48 rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
            />
          </div>
        ) : null}
      </div>

      <section>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Categorías
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Hacé clic en una categoría para ver y editar solo sus inscripciones.
        </p>
        <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tournament.categories.map((c) => {
            const eff = effectiveCategoryFeeCents(c, tournament);
            return (
              <li key={c.id} className="px-0">
                <button
                  type="button"
                  onClick={() => setCategoryQuery(c.id)}
                  className="flex w-full flex-wrap items-start justify-between gap-2 px-4 py-4 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                >
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {c.label}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {eff != null ? formatMoney(eff) : "—"}
                    {c.maxTeams != null ? ` · máx. ${c.maxTeams} equipos` : ""}
                  </span>
                  {c.subdivisions.length > 0 ? (
                    <span className="w-full text-xs text-zinc-600 dark:text-zinc-400">
                      Divisiones:{" "}
                      {c.subdivisions
                        .map((s) =>
                          s.maxTeams != null
                            ? `${s.label} (máx. ${s.maxTeams} equipos)`
                            : s.label,
                        )
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="w-full text-xs text-zinc-500">
                      Sin subdivisión interna. Clic para inscripciones →
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <TournamentSchedulePanel
        tournament={tournament}
        onScheduleSaved={refreshMerged}
      />

      <section>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Inscripciones
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Todas las categorías de este torneo (datos mock + localStorage).
        </p>
        <div className="mt-6">
          <MergedRegistrationsTable
            tournamentSlug={slug}
            hideTournamentColumn
          />
        </div>
      </section>
    </main>
  );
}

export default function AdminTournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cargando…
          </p>
        </main>
      }
    >
      <AdminTournamentDetailInner />
    </Suspense>
  );
}
