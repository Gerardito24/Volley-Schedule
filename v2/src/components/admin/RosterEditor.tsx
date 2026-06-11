"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RosterPlayer, TeamRoster } from "@/lib/types";
import { btnPrimary, card, inputClass, labelClass } from "./ui";

interface PlayerRow {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
}

export default function RosterEditor({ roster }: { roster: TeamRoster }) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(roster.teamName);
  const [coachName, setCoachName] = useState(roster.coachName);
  const [coachPhone, setCoachPhone] = useState(roster.coachPhone);
  const [players, setPlayers] = useState<PlayerRow[]>(
    roster.players.map((p) => ({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber ?? "",
      position: p.position ?? "",
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updatePlayer(id: string, patch: Partial<PlayerRow>) {
    setPlayers((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setMessage(null);
    setError(null);

    if (!teamName.trim()) {
      setError("El nombre del equipo es requerido.");
      return;
    }
    if (!coachName.trim()) {
      setError("El nombre del coach es requerido.");
      return;
    }
    if (players.some((p) => !p.name.trim())) {
      setError("Cada jugadora/jugador necesita un nombre.");
      return;
    }

    const playersBody: RosterPlayer[] = players.map((p) => ({
      id: p.id,
      name: p.name.trim(),
      ...(p.jerseyNumber.trim() ? { jerseyNumber: p.jerseyNumber.trim() } : {}),
      ...(p.position.trim() ? { position: p.position.trim() } : {}),
    }));

    setSaving(true);
    try {
      const res = await fetch(`/api/rosters/${roster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: teamName.trim(),
          coachName: coachName.trim(),
          coachPhone: coachPhone.trim(),
          players: playersBody,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudieron guardar los cambios.");
        return;
      }
      setMessage("Roster guardado.");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="text-lg font-semibold text-zinc-900">Editar roster</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Nombre del equipo *</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Coach *</label>
          <input
            type="text"
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Teléfono del coach</label>
          <input
            type="tel"
            value={coachPhone}
            onChange={(e) => setCoachPhone(e.target.value)}
            className={inputClass}
            placeholder="787-555-0123"
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Jugadoras/es ({players.length})</label>
          <button
            type="button"
            onClick={() =>
              setPlayers((rows) => [
                ...rows,
                { id: crypto.randomUUID(), name: "", jerseyNumber: "", position: "" },
              ])
            }
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            + Agregar jugadora/jugador
          </button>
        </div>
        {players.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            El roster está vacío. Agrega la primera jugadora o jugador.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={p.jerseyNumber}
                  onChange={(e) => updatePlayer(p.id, { jerseyNumber: e.target.value })}
                  className={`${inputClass} w-16 shrink-0`}
                  placeholder="#"
                  aria-label="Número de camiseta"
                />
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre completo"
                />
                <input
                  type="text"
                  value={p.position}
                  onChange={(e) => updatePlayer(p.id, { position: e.target.value })}
                  className={`${inputClass} w-36 shrink-0`}
                  placeholder="Posición"
                  aria-label="Posición"
                />
                <button
                  type="button"
                  onClick={() => setPlayers((rows) => rows.filter((r) => r.id !== p.id))}
                  className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar jugadora/jugador"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
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
  );
}
