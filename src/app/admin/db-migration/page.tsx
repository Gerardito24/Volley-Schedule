"use client";

import { useMemo, useState } from "react";
import { readOperators } from "@/lib/admin-operators-store";
import { readClubProfiles } from "@/lib/local-club-profiles";
import { readStoredImportBatches } from "@/lib/local-import-batches";
import { readStoredRegistrations } from "@/lib/local-registrations";
import { readStoredRosters } from "@/lib/local-team-rosters";
import { readStoredTournaments } from "@/lib/local-tournaments";
import {
  registrationRows as seedRegistrations,
  tournaments as seedTournaments,
} from "@/lib/mock-data";

export default function AdminDbMigrationPage() {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const payload = useMemo(
    () => ({
      tournaments: [...seedTournaments, ...readStoredTournaments()],
      registrations: [...seedRegistrations, ...readStoredRegistrations()],
      rosters: readStoredRosters(),
      clubProfiles: readClubProfiles(),
      importBatches: readStoredImportBatches(),
      adminOperators: readOperators(),
    }),
    [],
  );

  async function importToDb() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migration/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "No se pudo importar.");
      setResult(JSON.stringify(data.counts, null, 2));
    } catch (e) {
      setResult(e instanceof Error ? e.message : "No se pudo importar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Migración a Postgres
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Exporta los datos locales/seeds del navegador actual y los importa en
          Railway Postgres mediante la API temporal.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Torneos</dt>
            <dd className="font-semibold">{payload.tournaments.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Inscripciones</dt>
            <dd className="font-semibold">{payload.registrations.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Rosters</dt>
            <dd className="font-semibold">{payload.rosters.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Perfiles de club</dt>
            <dd className="font-semibold">{payload.clubProfiles.length}</dd>
          </div>
        </dl>

        <button
          type="button"
          disabled={busy}
          onClick={importToDb}
          className="mt-6 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Importando…" : "Importar a Postgres"}
        </button>

        {result ? (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-50">
            {result}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
