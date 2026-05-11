"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TournamentSchedulePanel } from "@/components/admin/TournamentSchedulePanel";
import { MergedRegistrationsTable } from "@/components/MergedRegistrationsTable";
import { readStoredTournaments } from "@/lib/local-tournaments";
import { mergeAdminTournaments } from "@/lib/merge-tournaments";
import type { TournamentMock } from "@/lib/mock-data";
import { tournaments as seedTournaments } from "@/lib/mock-data";
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

export default function AdminTournamentDetailPage() {
  const params = useParams();
  const slugParam = params.slug;
  const slug =
    typeof slugParam === "string"
      ? decodeURIComponent(slugParam)
      : Array.isArray(slugParam)
        ? decodeURIComponent(slugParam[0] ?? "")
        : "";

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

  return (
    <main className="flex flex-1 flex-col gap-10">
      <div>
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Torneos
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {tournament.name}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Torneo: {tournament.tournamentStartsOn} — {tournament.tournamentEndsOn} ·{" "}
              {tournament.locationLabel}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Límite inscripciones: {tournament.registrationDeadlineOn}
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              slug: {tournament.slug}
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {statusLabel[tournament.status]}
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {tournament.description}
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tournament.categories.map((c) => {
            const eff = effectiveCategoryFeeCents(c, tournament);
            return (
              <li key={c.id} className="px-4 py-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {c.label}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {eff != null ? formatMoney(eff) : "—"}
                    {c.maxTeams != null ? ` · máx. ${c.maxTeams} equipos` : ""}
                  </span>
                </div>
                {c.subdivisions.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Divisiones:{" "}
                    {c.subdivisions
                      .map((s) =>
                        s.maxTeams != null
                          ? `${s.label} (máx. ${s.maxTeams} equipos)`
                          : s.label,
                      )
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">
                    Sin subdivisión interna.
                  </p>
                )}
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
          Filtradas a este torneo (datos mock hasta conectar Supabase).
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
