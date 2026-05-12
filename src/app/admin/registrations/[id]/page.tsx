"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  readStoredRegistrations,
  upsertStoredRegistration,
} from "@/lib/local-registrations";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationRows as seedRows } from "@/lib/mock-data";
import type { RegistrationRowMock } from "@/lib/mock-data";
import { downloadRegistrationPdf } from "@/lib/registrationPdf";

const statusLabels: Record<RegistrationRowMock["status"], string> = {
  draft: "Borrador",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  under_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  waitlisted: "Lista de espera",
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
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToInput(c: number): string {
  return (c / 100).toFixed(2);
}

function RegistrationDetailInner() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const id =
    typeof rawId === "string"
      ? decodeURIComponent(rawId)
      : Array.isArray(rawId)
        ? decodeURIComponent(rawId[0] ?? "")
        : "";

  const loadRow = useCallback((): RegistrationRowMock | null => {
    const all = mergeAdminRegistrations(seedRows, readStoredRegistrations());
    return all.find((r) => r.id === id) ?? null;
  }, [id]);

  const [row, setRow] = useState<RegistrationRowMock | null>(() => loadRow());
  const [feeInput, setFeeInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const r = loadRow();
    setRow(r);
    if (r) setFeeInput(centsToInput(r.feeCents));
  }, [loadRow]);

  const [draft, setDraft] = useState<RegistrationRowMock | null>(null);
  useEffect(() => {
    if (row) {
      setDraft({ ...row });
      setFeeInput(centsToInput(row.feeCents));
    }
  }, [row]);

  const handleSave = useCallback(() => {
    if (!draft) return;
    const feeParsed = dollarsToCents(feeInput);
    if (feeInput.trim() && feeParsed === null) {
      setSaveError("Tarifa inválida.");
      return;
    }
    const next: RegistrationRowMock = {
      id: draft.id,
      tournamentSlug: draft.tournamentSlug,
      tournamentName: draft.tournamentName,
      divisionLabel: draft.divisionLabel,
      teamName: draft.teamName,
      clubName: draft.clubName,
      status: draft.status,
      updatedAt: new Date().toISOString().slice(0, 10),
      feeCents: feeParsed ?? draft.feeCents,
      registeredAt: draft.registeredAt,
      categoryId: draft.categoryId,
      subdivisionId: draft.subdivisionId ?? null,
    };
    upsertStoredRegistration(next);
    setDraft(next);
    setRow(next);
    setFeeInput(centsToInput(next.feeCents));
    setSaveError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }, [draft, feeInput]);

  const isReadOnly = useMemo(() => {
    // seed rows are read-only until the user saves a local copy
    const stored = readStoredRegistrations();
    return !stored.find((r) => r.id === id);
  }, [id]);

  if (!id) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Enlace inválido.</p>
        <Link href="/admin/registrations" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          ← Volver a inscripciones
        </Link>
      </main>
    );
  }

  if (!row || !draft) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Inscripción no encontrada
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No existe ninguna inscripción con ID{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">{id}</code>.
        </p>
        <Link href="/admin/registrations" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          ← Volver a inscripciones
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Volver
        </button>
        <span className="text-zinc-400">/</span>
        <Link
          href="/admin/registrations"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Inscripciones
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {draft.teamName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{draft.clubName} · {draft.divisionLabel} · {draft.tournamentName}</p>
          <p className="mt-0.5 font-mono text-xs text-zinc-400">{draft.id}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {statusLabels[draft.status]}
        </span>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Datos de la inscripción
        </h2>
        {isReadOnly ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Registro demo (seed). Guardá cualquier cambio para convertirlo en local y poder editarlo.
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Club</span>
            <input
              value={draft.clubName}
              onChange={(e) => setDraft((d) => d ? { ...d, clubName: e.target.value } : d)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Equipo</span>
            <input
              value={draft.teamName}
              onChange={(e) => setDraft((d) => d ? { ...d, teamName: e.target.value } : d)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Torneo</span>
            <input
              value={draft.tournamentName}
              onChange={(e) => setDraft((d) => d ? { ...d, tournamentName: e.target.value } : d)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">División</span>
            <input
              value={draft.divisionLabel}
              onChange={(e) => setDraft((d) => d ? { ...d, divisionLabel: e.target.value } : d)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Estado</span>
            <select
              value={draft.status}
              onChange={(e) => setDraft((d) => d ? { ...d, status: e.target.value as RegistrationRowMock["status"] } : d)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {(Object.keys(statusLabels) as RegistrationRowMock["status"][]).map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Tarifa (USD)</span>
            <input
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>

        <dl className="mt-5 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-zinc-400">Registrado</dt>
            <dd className="font-mono">{draft.registeredAt}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-400">Actualizado</dt>
            <dd className="font-mono">{draft.updatedAt}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-400">Categoría ID</dt>
            <dd className="font-mono">{draft.categoryId}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-400">Tarifa actual</dt>
            <dd>{formatMoney(draft.feeCents)}</dd>
          </div>
        </dl>

        {saveError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{saveError}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={() => downloadRegistrationPdf(draft)}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Exportar PDF
          </button>
          {saved ? (
            <span className="self-center text-sm text-emerald-600 dark:text-emerald-400">
              Guardado.
            </span>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function RegistrationDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-zinc-500">Cargando…</p>
        </main>
      }
    >
      <RegistrationDetailInner />
    </Suspense>
  );
}
