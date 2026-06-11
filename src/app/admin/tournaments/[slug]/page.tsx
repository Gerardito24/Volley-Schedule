"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { MergedRegistrationsTable } from "@/components/MergedRegistrationsTable";
import { Button } from "@/components/admin/ui";
import { computeMergedTournaments } from "@/hooks/use-merged-tournaments";
import {
  readStoredTournaments,
  upsertStoredTournament,
} from "@/lib/local-tournaments";
import {
  LOCAL_REGISTRATIONS_KEY,
  readStoredRegistrations,
  upsertStoredRegistration,
} from "@/lib/local-registrations";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import type { CategoryGender, CategoryMock, TournamentMock, TournamentVenue } from "@/lib/mock-data";
import {
  registrationRows as seedRegistrationRows,
  tournaments as seedTournaments,
  buildDefaultCategoryLabel,
  categoryGenderLabel,
  displayCategoryName,
  formatRegistrationDivisionLabel,
  formatTournamentLocationsLine,
  normalizeTournament,
  parseCategoryGender,
} from "@/lib/mock-data";
import { effectiveCategoryFeeCents } from "@/lib/tournament-pricing";

const statusLabel: Record<TournamentMock["status"], string> = {
  open: "Abierto",
  closed: "Cerrado",
  draft: "Borrador",
};

type TabId = "resumen" | "config" | "categorias" | "inscripciones" | "itinerario";

const TOURNAMENT_TABS: { id: TabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "config", label: "Configuración" },
  { id: "categorias", label: "Categorías" },
  { id: "inscripciones", label: "Inscripciones" },
  { id: "itinerario", label: "Itinerario" },
];

const VALID_TABS = new Set<TabId>(TOURNAMENT_TABS.map((t) => t.id));

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

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

type DivisionRowDraft = { id: string; label: string };

type GeneralDraft = {
  name: string;
  description: string;
  venueRows: VenueRowDraft[];
  divisionRows: DivisionRowDraft[];
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
    divisionRows: nt.divisions.map((d) => ({ id: d.id, label: d.label })),
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
    ageLabel: c.ageLabel,
    divisionId: c.divisionId,
    gender: parseCategoryGender(c.gender),
    categoryTitleManual: c.categoryTitleManual ?? false,
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
  const tabParam = searchParams.get("tab");
  const activeTab: TabId =
    tabParam && VALID_TABS.has(tabParam as TabId) ? (tabParam as TabId) : "resumen";

  const [merged, setMerged] = useState<TournamentMock[]>(() =>
    mergeAdminTournaments(seedTournaments, readStoredTournaments()),
  );

  const refreshMerged = useCallback(async () => {
    setMerged(await computeMergedTournaments());
  }, []);

  useEffect(() => {
    void refreshMerged();
  }, [slug, refreshMerged]);

  const tournament = useMemo(
    () => merged.find((t) => t.slug === slug),
    [merged, slug],
  );

  const [generalDraft, setGeneralDraft] = useState<GeneralDraft | null>(null);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<{
    label: string;
    ageLabel: string;
    divisionId: string;
    gender: CategoryGender;
    categoryTitleManual: boolean;
    feeInput: string;
    maxTeamsInput: string;
  } | null>(null);
  const [categorySaved, setCategorySaved] = useState(false);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState(false);
  const [categoryTitleDraft, setCategoryTitleDraft] = useState("");

  useEffect(() => {
    if (!tournament) {
      setGeneralDraft(null);
      return;
    }
    setGeneralDraft(tournamentToGeneralDraft(tournament));
    setGeneralError(null);
  }, [tournament]);

  const selectedCategory = useMemo(() => {
    if (!tournament || !selectedCategoryId) return null;
    return tournament.categories.find((c) => c.id === selectedCategoryId) ?? null;
  }, [tournament, selectedCategoryId]);

  const [regRevision, setRegRevision] = useState(0);
  useEffect(() => {
    const bump = () => setRegRevision((x) => x + 1);
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

  const tournamentStats = useMemo(() => {
    if (!tournament) return null;
    const nt = normalizeTournament(tournament);
    const regs = mergeAdminRegistrations(
      seedRegistrationRows,
      readStoredRegistrations(),
    ).filter((r) => r.tournamentSlug === tournament.slug);
    let courtSum = 0;
    let hasCourtNumbers = false;
    for (const v of nt.venues) {
      if (v.courtCount != null) {
        hasCourtNumbers = true;
        courtSum += v.courtCount;
      }
    }
    return {
      teamCount: regs.length,
      categoryCount: nt.categories.length,
      courtsLabel: hasCourtNumbers ? String(courtSum) : "—",
      scheduleCategoryCount: nt.schedule?.categorySchedules.length ?? 0,
      schedulePublished: nt.schedule?.published ?? false,
    };
  }, [tournament, merged, regRevision]);

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryDraft(null);
      setEditingCategoryTitle(false);
      return;
    }
    setCategoryDraft(categoryToDraft(selectedCategory));
    setEditingCategoryTitle(false);
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

  const setTab = useCallback(
    (tab: TabId) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", tab);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const syncRegistrationDivisionLabelsForCategory = useCallback(
    (fullTournament: TournamentMock, categoryId: string, category: CategoryMock) => {
      const mergedRows = mergeAdminRegistrations(
        seedRegistrationRows,
        readStoredRegistrations(),
      );
      for (const r of mergedRows) {
        if (r.tournamentSlug !== slug || r.categoryId !== categoryId) continue;
        const nextLabel = formatRegistrationDivisionLabel(
          fullTournament,
          category,
          r.subdivisionId ?? null,
        );
        if (r.divisionLabel === nextLabel) continue;
        upsertStoredRegistration({ ...r, divisionLabel: nextLabel });
      }
    },
    [slug],
  );

  const persistTournament = useCallback(
    (next: TournamentMock) => {
      upsertStoredTournament(next);
      void refreshMerged();
    },
    [refreshMerged],
  );

  const handleAddCategory = useCallback(() => {
    if (!tournament) return;
    const nt = normalizeTournament(tournament);
    const firstDivId = nt.divisions[0]?.id ?? "div-general";
    const newCat: CategoryMock = {
      id: `admin-cat-${crypto.randomUUID()}`,
      label: buildDefaultCategoryLabel("", firstDivId, nt.divisions, "mixto"),
      ageLabel: "",
      divisionId: firstDivId,
      gender: "mixto",
      categoryTitleManual: false,
      feeCents: nt.registrationFeeCents,
      maxTeams: null,
      subdivisions: [],
    };
    const next = normalizeTournament({
      ...nt,
      categories: [...nt.categories, newCat],
    });
    persistTournament(next);
    setCategoryQuery(newCat.id);
  }, [persistTournament, setCategoryQuery, tournament]);

  const handleSaveGeneral = useCallback(() => {
    if (!tournament || !generalDraft) return;
    setGeneralError(null);
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

    const divisionsPayload = generalDraft.divisionRows
      .map((r) => ({ id: r.id, label: r.label.trim() }))
      .filter((r) => r.label.length > 0);
    if (divisionsPayload.length === 0) {
      setGeneralError("Agrega al menos una división con nombre.");
      return;
    }
    const validDivIds = new Set(divisionsPayload.map((d) => d.id));
    const fallbackDivId = divisionsPayload[0]!.id;
    const categories = tournament.categories.map((c) =>
      validDivIds.has(c.divisionId) ? c : { ...c, divisionId: fallbackDivId },
    );

    const next = normalizeTournament({
      ...tournament,
      name: generalDraft.name.trim() || tournament.name,
      description: generalDraft.description,
      venues,
      divisions: divisionsPayload,
      categories,
      locationLabel: venues.map((v) => v.label).join(" · "),
      registrationDeadlineOn: generalDraft.registrationDeadlineOn,
      tournamentStartsOn: generalDraft.tournamentStartsOn,
      tournamentEndsOn: generalDraft.tournamentEndsOn,
      status: generalDraft.status,
      registrationFeeCents: dollarsToCents(generalDraft.registrationFeeInput),
      publicEntryFeeCents: dollarsToCents(generalDraft.publicEntryFeeInput),
    });
    persistTournament(next);
    for (const cat of next.categories) {
      syncRegistrationDivisionLabelsForCategory(next, cat.id, cat);
    }
    setGeneralSaved(true);
    window.setTimeout(() => setGeneralSaved(false), 2000);
  }, [
    generalDraft,
    persistTournament,
    syncRegistrationDivisionLabelsForCategory,
    tournament,
  ]);

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

    const feeTrim = categoryDraft.feeInput.trim();
    const nextFeeCents =
      feeTrim === "" ? null : (feeParsed ?? selectedCategory.feeCents);

    const ageLabel = categoryDraft.ageLabel.trim();
    const divisionId =
      tournament.divisions.some((d) => d.id === categoryDraft.divisionId)
        ? categoryDraft.divisionId
        : (tournament.divisions[0]?.id ?? selectedCategory.divisionId);

    const autoLabel = buildDefaultCategoryLabel(
      ageLabel,
      divisionId,
      tournament.divisions,
      categoryDraft.gender,
    );
    const finalLabel =
      categoryDraft.categoryTitleManual && categoryDraft.label.trim()
        ? categoryDraft.label.trim()
        : autoLabel;

    const nextCat: CategoryMock = {
      ...selectedCategory,
      label: finalLabel,
      ageLabel,
      divisionId,
      gender: categoryDraft.gender,
      categoryTitleManual: categoryDraft.categoryTitleManual,
      feeCents: nextFeeCents,
      maxTeams: nextMax,
    };
    const nextCategories = tournament.categories.map((c) =>
      c.id === selectedCategory.id ? nextCat : c,
    );

    const next: TournamentMock = normalizeTournament({
      ...tournament,
      categories: nextCategories,
    });
    persistTournament(next);
    syncRegistrationDivisionLabelsForCategory(
      next,
      selectedCategory.id,
      nextCat,
    );
    setCategorySaved(true);
    window.setTimeout(() => setCategorySaved(false), 2000);
  }, [
    categoryDraft,
    persistTournament,
    selectedCategory,
    syncRegistrationDivisionLabelsForCategory,
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
          className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
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
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">{slug}</code>.
        </p>
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
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
          className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
        >
          ← Torneos
        </Link>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Categoría no encontrada.
        </p>
        <button
          type="button"
          onClick={() => setCategoryQuery(null)}
          className="w-fit text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
        >
          Volver al torneo
        </button>
      </main>
    );
  }

  if (selectedCategory && categoryDraft) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setCategoryQuery(null)}
            className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
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
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Categoría
            </p>
            {editingCategoryTitle ? (
              <input
                type="text"
                autoFocus
                value={categoryTitleDraft}
                onChange={(e) => setCategoryTitleDraft(e.target.value)}
                onBlur={() => {
                  if (!categoryDraft) return;
                  const auto = buildDefaultCategoryLabel(
                    categoryDraft.ageLabel,
                    categoryDraft.divisionId,
                    tournament.divisions,
                    categoryDraft.gender,
                  );
                  const draft = categoryTitleDraft.trim();
                  if (!draft || draft === auto) {
                    setCategoryDraft((d) =>
                      d ? { ...d, label: auto, categoryTitleManual: false } : d,
                    );
                  } else {
                    setCategoryDraft((d) =>
                      d ? { ...d, label: draft, categoryTitleManual: true } : d,
                    );
                  }
                  setEditingCategoryTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === "Escape") setEditingCategoryTitle(false);
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-lg font-semibold text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {displayCategoryName(selectedCategory, tournament.divisions)}
                </span>
                <button
                  type="button"
                  title="Editar nombre de la categoría"
                  onClick={() => {
                    setCategoryTitleDraft(
                      displayCategoryName(selectedCategory, tournament.divisions),
                    );
                    setEditingCategoryTitle(true);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-sky-700 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-sky-400"
                >
                  <IconPencil className="h-4 w-4" />
                  <span className="sr-only">Editar nombre</span>
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Nombre = edad + división + género. Usá el lápiz para un título distinto. Guardá abajo.
            </p>
          </div>
          <p className="mb-6 text-xs text-zinc-500">
            Edad, división del torneo, género, tarifa y cupo.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Edad
              </span>
              <input
                type="text"
                value={categoryDraft.ageLabel}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategoryDraft((d) => {
                    if (!d) return d;
                    const next = { ...d, ageLabel: v };
                    if (!d.categoryTitleManual) {
                      next.label = buildDefaultCategoryLabel(
                        v,
                        d.divisionId,
                        tournament.divisions,
                        d.gender,
                      );
                    }
                    return next;
                  });
                }}
                placeholder="Ej. 14U"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-sm sm:col-span-2 sm:max-w-md">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                División del torneo (grupo)
              </span>
              <select
                value={categoryDraft.divisionId}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategoryDraft((d) => {
                    if (!d) return d;
                    const next = { ...d, divisionId: v };
                    if (!d.categoryTitleManual) {
                      next.label = buildDefaultCategoryLabel(
                        d.ageLabel,
                        v,
                        tournament.divisions,
                        d.gender,
                      );
                    }
                    return next;
                  });
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {tournament.divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2 sm:max-w-md">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Género
              </span>
              <select
                value={categoryDraft.gender}
                onChange={(e) => {
                  const v = e.target.value as CategoryGender;
                  setCategoryDraft((d) => {
                    if (!d) return d;
                    const next = { ...d, gender: v };
                    if (!d.categoryTitleManual) {
                      next.label = buildDefaultCategoryLabel(
                        d.ageLabel,
                        d.divisionId,
                        tournament.divisions,
                        v,
                      );
                    }
                    return next;
                  });
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="mixto">Mixto</option>
              </select>
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
            <Button type="button" onClick={handleSaveCategory}>
              Guardar categoría
            </Button>
            {categorySaved ? (
              <span className="text-sm text-sky-600 dark:text-sky-400">
                Guardado.
              </span>
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Inscripciones —{" "}
            {displayCategoryName(selectedCategory, tournament.divisions)}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Solo equipos inscritos en esta categoría.
          </p>
          <div className="mt-6">
            <MergedRegistrationsTable
              tournamentSlug={slug}
              categoryId={selectedCategory.id}
              tournament={tournament}
              hideTournamentColumn
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/tournaments"
        className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
      >
        ← Torneos
      </Link>

      <nav aria-label="Secciones del torneo" className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TOURNAMENT_TABS.map((t) => {
          const selected = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                selected
                  ? "border border-b-white border-zinc-200 bg-white text-sky-700 dark:border-zinc-700 dark:border-b-zinc-900 dark:bg-zinc-900 dark:text-sky-400"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
              }`}
              aria-current={selected ? "page" : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "resumen" ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {tournament.name}
              </h2>
              <p className="mt-1 truncate font-mono text-xs text-zinc-500" title={tournament.slug}>
                {tournament.slug}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
              {statusLabel[tournament.status]}
            </span>
          </div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {tournament.tournamentStartsOn} — {tournament.tournamentEndsOn}
            </span>
            <span className="text-zinc-400"> · </span>
            {formatTournamentLocationsLine(tournament)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Cierre de inscripciones: {tournament.registrationDeadlineOn}
          </p>
          {tournamentStats ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: "Equipos", value: String(tournamentStats.teamCount) },
                { label: "Canchas", value: tournamentStats.courtsLabel },
                { label: "Categorías", value: String(tournamentStats.categoryCount) },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/90 px-2 py-3 text-center dark:border-zinc-800 dark:bg-zinc-950/50"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {cell.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "config" && generalDraft ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Configuración del torneo
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Nombre, fechas, sedes, divisiones y tarifas.
          </p>
            <div className="flex flex-wrap items-center justify-end gap-4">
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
              <div className="relative lg:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Divisiones del torneo
                  </span>
                  <button
                    type="button"
                    title="Agregar división"
                    onClick={() =>
                      setGeneralDraft((d) =>
                        d
                          ? {
                              ...d,
                              divisionRows: [
                                ...d.divisionRows,
                                { id: crypto.randomUUID(), label: "" },
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
                  Las categorías eligen una de estas divisiones (grupo/nivel). El género se define por categoría. Guardá con Guardar datos del torneo.
                </p>
                <div className="mt-2 space-y-2">
                  {generalDraft.divisionRows.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) =>
                          setGeneralDraft((d) => {
                            if (!d) return d;
                            return {
                              ...d,
                              divisionRows: d.divisionRows.map((r) =>
                                r.id === row.id
                                  ? { ...r, label: e.target.value }
                                  : r,
                              ),
                            };
                          })
                        }
                        placeholder="Nombre de la división"
                        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                      {generalDraft.divisionRows.length > 1 ? (
                        <button
                          type="button"
                          title="Quitar división"
                          onClick={() =>
                            setGeneralDraft((d) => {
                              if (!d || d.divisionRows.length <= 1) return d;
                              return {
                                ...d,
                                divisionRows: d.divisionRows.filter(
                                  (r) => r.id !== row.id,
                                ),
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
            {generalError ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                {generalError}
              </p>
            ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleSaveGeneral}>
              Guardar datos del torneo
            </Button>
            {generalSaved ? (
              <span className="text-sm text-sky-600 dark:text-sky-400">
                Guardado.
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "categorias" ? (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Categorías
          </h3>
          <Button
            type="button"
            variant="secondary"
            className="border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-900/60"
            onClick={handleAddCategory}
          >
            + Añadir categoría
          </Button>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Elegí una categoría para ver inscripciones y editarla.
        </p>
        <ul className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 sm:grid sm:grid-cols-2 sm:divide-y-0 sm:gap-3 sm:border-0 sm:bg-transparent">
          {tournament.categories.map((c) => {
            const eff = effectiveCategoryFeeCents(c, tournament);
            const div = tournament.divisions.find((d) => d.id === c.divisionId);
            const meta =
              c.categoryTitleManual && c.label.trim()
                ? [c.ageLabel?.trim(), div?.label, categoryGenderLabel(c.gender)]
                    .filter(Boolean)
                    .join(" · ")
                : null;
            const title = displayCategoryName(c, tournament.divisions);
            return (
              <li key={c.id} className="sm:px-0">
                <button
                  type="button"
                  onClick={() => setCategoryQuery(c.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm transition hover:bg-zinc-50 sm:rounded-xl sm:border sm:border-zinc-200 sm:py-4 dark:hover:bg-zinc-800/80 dark:sm:border-zinc-700"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {title}
                    </span>
                    {meta ? (
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                        {meta}
                      </span>
                    ) : null}
                    {c.subdivisions.length > 0 ? (
                      <span className="mt-1 block text-xs text-zinc-500">
                        {c.subdivisions
                          .map((s) =>
                            s.maxTeams != null
                              ? `${s.label} (máx. ${s.maxTeams})`
                              : s.label,
                          )
                          .join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {eff != null ? formatMoney(eff) : "—"}
                    </span>
                    {c.maxTeams != null ? (
                      <span className="text-xs text-zinc-500">máx. {c.maxTeams}</span>
                    ) : null}
                    <span className="text-lg leading-none text-zinc-300 dark:text-zinc-600" aria-hidden>
                      ›
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      ) : null}

      {activeTab === "itinerario" ? (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Itinerario y brackets
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Abrí una pantalla dedicada para generar partidos, revisar canchas
              ocupadas y manejar el bracket visualmente.
            </p>
          </div>
          <Link href={`/admin/tournaments/${encodeURIComponent(slug)}/schedule`}>
            <Button>Abrir creador de itinerario</Button>
          </Link>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <dt className="text-xs text-zinc-500">Categorías con itinerario</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {tournamentStats?.scheduleCategoryCount ?? 0}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <dt className="text-xs text-zinc-500">Estado público</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {tournamentStats?.schedulePublished ? "Publicado" : "No publicado"}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
            <dt className="text-xs text-zinc-500">Canchas configuradas</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {tournamentStats?.courtsLabel ?? "—"}
            </dd>
          </div>
        </dl>
      </section>
      ) : null}

      {activeTab === "inscripciones" ? (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Inscripciones
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Todas las categorías de este torneo.
        </p>
        <div className="mt-6">
          <MergedRegistrationsTable
            tournamentSlug={slug}
            hideTournamentColumn
          />
        </div>
      </section>
      ) : null}
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
