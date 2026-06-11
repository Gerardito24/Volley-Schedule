"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, PageHeader } from "@/components/admin/ui";
import { useMergedTournaments } from "@/hooks/use-merged-tournaments";
import type { TournamentMock } from "@/lib/mock-data";
import { formatTournamentLocationsLine } from "@/lib/mock-data";
import { minEffectiveFeeCents } from "@/lib/tournament-pricing";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const statusLabel: Record<TournamentMock["status"], string> = {
  open: "Abierto",
  closed: "Cerrado",
  draft: "Borrador",
};

type StatusFilter = "all" | TournamentMock["status"];

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abierto" },
  { value: "closed", label: "Cerrado" },
  { value: "draft", label: "Borrador" },
];

export default function AdminTournamentsPage() {
  const merged = useMergedTournaments();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const sorted = useMemo(
    () =>
      [...merged].sort((a, b) =>
        a.tournamentStartsOn.localeCompare(b.tournamentStartsOn),
      ),
    [merged],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        formatTournamentLocationsLine(t).toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
      );
    });
  }, [sorted, search, statusFilter]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        description="Gestiona torneos, fechas, categorías e inscripciones desde un solo lugar."
        actions={
          <Link href="/admin/tournaments/new">
            <Button>Crear torneo</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, ubicación o slug…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filtrar por estado"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {statusFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          {sorted.length === 0
            ? "Aún no hay torneos. Creá el primero con el botón de arriba."
            : "Ningún torneo coincide con la búsqueda o el filtro."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((t) => {
            const minFee = minEffectiveFeeCents(t);
            const nCat = t.categories.length;
            return (
              <li key={t.slug}>
                <Link
                  href={`/admin/tournaments/${encodeURIComponent(t.slug)}`}
                  className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {t.name}
                    </h3>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {statusLabel[t.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {t.tournamentStartsOn} — {t.tournamentEndsOn} · {formatTournamentLocationsLine(t)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Inscripciones hasta {t.registrationDeadlineOn}
                  </p>
                  <p className="mt-3 line-clamp-2 flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {t.description}
                  </p>
                  <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {minFee != null ? (
                      <>Desde {formatMoney(minFee)} · </>
                    ) : (
                      <>Tarifas por definir · </>
                    )}
                    {nCat} {nCat === 1 ? "categoría" : "categorías"}
                  </p>
                  <span className="mt-4 text-sm font-medium text-sky-700 dark:text-sky-400">
                    Abrir panel →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
