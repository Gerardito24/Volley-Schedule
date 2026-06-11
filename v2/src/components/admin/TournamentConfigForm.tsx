"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tournament, TournamentStatus, Venue } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import { btnDanger, btnPrimary, card, inputClass, labelClass } from "./ui";

interface VenueRow {
  id: string;
  label: string;
  courtCount: string;
}

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

export default function TournamentConfigForm({ tournament }: { tournament: Tournament }) {
  const router = useRouter();

  const [name, setName] = useState(tournament.name);
  const [description, setDescription] = useState(tournament.description);
  const [startsOn, setStartsOn] = useState(tournament.startsOn);
  const [endsOn, setEndsOn] = useState(tournament.endsOn);
  const [deadline, setDeadline] = useState(tournament.registrationDeadlineOn);
  const [status, setStatus] = useState<TournamentStatus>(tournament.status);
  const [venues, setVenues] = useState<VenueRow[]>(
    tournament.venues.map((v) => ({ id: v.id, label: v.label, courtCount: String(v.courtCount) })),
  );
  const [baseFeeUsd, setBaseFeeUsd] = useState(centsToUsdInput(tournament.baseFeeCents));
  const [publicFeeUsd, setPublicFeeUsd] = useState(
    centsToUsdInput(tournament.publicEntryFeeCents),
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function updateVenue(id: string, patch: Partial<VenueRow>) {
    setVenues((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setMessage(null);
    setError(null);

    if (!name.trim()) {
      setError("El nombre es requerido.");
      return;
    }
    if (!startsOn || !endsOn || endsOn < startsOn) {
      setError("Verifica las fechas de inicio y fin.");
      return;
    }
    if (!deadline) {
      setError("El cierre de inscripciones es requerido.");
      return;
    }
    if (venues.length === 0 || venues.some((v) => !v.label.trim())) {
      setError("Cada sede necesita un nombre.");
      return;
    }
    if (venues.some((v) => !Number.isInteger(Number(v.courtCount)) || Number(v.courtCount) < 1)) {
      setError("Cada sede necesita al menos 1 cancha.");
      return;
    }

    const venuesBody: Venue[] = venues.map((v) => ({
      id: v.id,
      label: v.label.trim(),
      courtCount: Number(v.courtCount),
    }));

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          startsOn,
          endsOn,
          registrationDeadlineOn: deadline,
          status,
          venues: venuesBody,
          baseFeeCents: parseUsdToCents(baseFeeUsd),
          publicEntryFeeCents: parseUsdToCents(publicFeeUsd),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudieron guardar los cambios.");
        return;
      }
      setMessage("Cambios guardados.");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTournament() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo eliminar el torneo.");
        setConfirmOpen(false);
        return;
      }
      router.push("/admin/torneos");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={`${card} p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">Configuración general</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
            />
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
            <label className={labelClass}>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TournamentStatus)}
              className={inputClass}
            >
              <option value="draft">Borrador</option>
              <option value="open">Inscripciones abiertas</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Tarifa base por equipo (USD)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={baseFeeUsd}
              onChange={(e) => setBaseFeeUsd(e.target.value)}
              className={inputClass}
              placeholder="Sin tarifa"
            />
          </div>
          <div>
            <label className={labelClass}>Entrada al público (USD)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={publicFeeUsd}
              onChange={(e) => setPublicFeeUsd(e.target.value)}
              className={inputClass}
              placeholder="Gratis"
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label className={labelClass}>Sedes</label>
            <button
              type="button"
              onClick={() =>
                setVenues((rows) => [
                  ...rows,
                  { id: crypto.randomUUID(), label: "", courtCount: "1" },
                ])
              }
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              + Agregar sede
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {venues.map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={v.label}
                  onChange={(e) => updateVenue(v.id, { label: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre de la sede"
                />
                <input
                  type="number"
                  min={1}
                  value={v.courtCount}
                  onChange={(e) => updateVenue(v.id, { courtCount: e.target.value })}
                  className={`${inputClass} w-28 shrink-0`}
                  aria-label="Número de canchas"
                />
                <button
                  type="button"
                  onClick={() => setVenues((rows) => rows.filter((r) => r.id !== v.id))}
                  disabled={venues.length <= 1}
                  className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Eliminar sede"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

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
      </div>

      <div className={`${card} border-red-200 p-6`}>
        <h2 className="text-lg font-semibold text-red-700">Zona de peligro</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Eliminar el torneo es permanente. Las inscripciones asociadas dejarán de mostrarse en
          los listados por torneo.
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className={`${btnDanger} mt-4`}
        >
          Eliminar torneo
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar este torneo?"
        description={`Se eliminará "${tournament.name}" de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        busy={deleting}
        onConfirm={removeTournament}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
