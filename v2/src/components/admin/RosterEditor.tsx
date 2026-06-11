"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RosterPlayer, TeamRoster } from "@/lib/types";
import { btnPrimary, card, inputClass, labelClass } from "./ui";

interface PlayerRow {
  id: string;
  name: string;
  jerseyNumber: string;
  birthDate: string;
  affiliationNumber: string;
}

export default function RosterEditor({ roster }: { roster: TeamRoster }) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(roster.teamName);

  const [coachName, setCoachName] = useState(roster.coachName);
  const [coachPhone, setCoachPhone] = useState(roster.coachPhone);
  const [coachAffiliation, setCoachAffiliation] = useState(roster.coachAffiliation ?? "");

  const [repName, setRepName] = useState(roster.repName ?? "");
  const [repPhone, setRepPhone] = useState(roster.repPhone ?? "");
  const [repAffiliation, setRepAffiliation] = useState(roster.repAffiliation ?? "");

  const [players, setPlayers] = useState<PlayerRow[]>(
    roster.players.map((p) => ({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber ?? "",
      birthDate: p.birthDate ?? "",
      affiliationNumber: p.affiliationNumber ?? "",
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
      ...(p.birthDate ? { birthDate: p.birthDate } : {}),
      ...(p.affiliationNumber.trim()
        ? { affiliationNumber: p.affiliationNumber.trim() }
        : {}),
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
          coachAffiliation: coachAffiliation.trim() || undefined,
          repName: repName.trim() || undefined,
          repPhone: repPhone.trim() || undefined,
          repAffiliation: repAffiliation.trim() || undefined,
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
    <div className="space-y-6">
      {/* Equipo y cuerpo técnico */}
      <div className={`${card} p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">Equipo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className={labelClass}>Nombre del equipo *</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className={`${inputClass} sm:max-w-sm`}
            />
          </div>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-zinc-900">Coach</h3>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              type="text"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              type="tel"
              value={coachPhone}
              onChange={(e) => setCoachPhone(e.target.value)}
              className={inputClass}
              placeholder="787-555-0123"
            />
          </div>
          <div>
            <label className={labelClass}>Núm. afiliación</label>
            <input
              type="text"
              value={coachAffiliation}
              onChange={(e) => setCoachAffiliation(e.target.value)}
              className={inputClass}
              placeholder="FPV-0000"
            />
          </div>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-zinc-900">Apoderado/a</h3>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              type="text"
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              type="tel"
              value={repPhone}
              onChange={(e) => setRepPhone(e.target.value)}
              className={inputClass}
              placeholder="787-555-0123"
            />
          </div>
          <div>
            <label className={labelClass}>Núm. afiliación</label>
            <input
              type="text"
              value={repAffiliation}
              onChange={(e) => setRepAffiliation(e.target.value)}
              className={inputClass}
              placeholder="FPV-0000"
            />
          </div>
        </div>
      </div>

      {/* Jugadoras/es */}
      <div className={`${card} p-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Jugadoras/es <span className="text-sm font-normal text-zinc-400">({players.length})</span>
          </h2>
          <button
            type="button"
            onClick={() =>
              setPlayers((rows) => [
                ...rows,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  jerseyNumber: "",
                  birthDate: "",
                  affiliationNumber: "",
                },
              ])
            }
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            + Agregar jugadora/jugador
          </button>
        </div>

        {players.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            El roster está vacío. Agrega la primera jugadora o jugador.
          </p>
        ) : (
          <div className="thin-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="w-20 pb-2 pr-3 font-medium">Camisa</th>
                  <th className="pb-2 pr-3 font-medium">Nombre completo *</th>
                  <th className="w-44 pb-2 pr-3 font-medium">Nacimiento</th>
                  <th className="w-36 pb-2 pr-3 font-medium">Núm. afiliación</th>
                  <th className="w-10 pb-2" />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-3">
                      <input
                        type="text"
                        value={p.jerseyNumber}
                        onChange={(e) => updatePlayer(p.id, { jerseyNumber: e.target.value })}
                        className={inputClass}
                        placeholder="#"
                        aria-label="Número de camisa"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                        className={inputClass}
                        placeholder="Nombre completo"
                        aria-label="Nombre completo"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        type="date"
                        value={p.birthDate}
                        onChange={(e) => updatePlayer(p.id, { birthDate: e.target.value })}
                        className={inputClass}
                        aria-label="Fecha de nacimiento"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        type="text"
                        value={p.affiliationNumber}
                        onChange={(e) =>
                          updatePlayer(p.id, { affiliationNumber: e.target.value })
                        }
                        className={inputClass}
                        placeholder="FPV-0000"
                        aria-label="Número de afiliación"
                      />
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPlayers((rows) => rows.filter((r) => r.id !== p.id))
                        }
                        className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar jugadora/jugador"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
}
