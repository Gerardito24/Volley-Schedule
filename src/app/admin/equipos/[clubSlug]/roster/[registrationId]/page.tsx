"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  readStoredRosters,
  upsertStoredRoster,
  LOCAL_ROSTERS_KEY,
} from "@/lib/local-team-rosters";
import { mergeTeamRosters } from "@/lib/merge-team-rosters";
import { seedTeamRosters } from "@/lib/seed-team-rosters";
import { readStoredRegistrations, LOCAL_REGISTRATIONS_KEY } from "@/lib/local-registrations";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationRows as seedRows } from "@/lib/mock-data";
import type { TeamRoster, RosterPlayer } from "@/lib/team-roster-types";
import { slugify } from "@/lib/slugify";

function RosterDetailInner() {
  const params = useParams();

  const clubSlug =
    typeof params.clubSlug === "string"
      ? decodeURIComponent(params.clubSlug)
      : Array.isArray(params.clubSlug)
        ? decodeURIComponent(params.clubSlug[0] ?? "")
        : "";

  const registrationId =
    typeof params.registrationId === "string"
      ? decodeURIComponent(params.registrationId)
      : Array.isArray(params.registrationId)
        ? decodeURIComponent(params.registrationId[0] ?? "")
        : "";

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((x) => x + 1);
    window.addEventListener("volleyschedule-rosters-changed", bump);
    window.addEventListener("volleyschedule-registrations-changed", bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_ROSTERS_KEY || e.key === LOCAL_REGISTRATIONS_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("volleyschedule-rosters-changed", bump);
      window.removeEventListener("volleyschedule-registrations-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Resolve roster: check stored first, then fall back to a placeholder built
  // from the matching registration (for teams that registered but haven't saved
  // a roster yet).
  const baseRoster = useMemo((): TeamRoster | null => {
    const allRegs = mergeAdminRegistrations(seedRows, readStoredRegistrations());
    const allRosters = mergeTeamRosters(seedTeamRosters, readStoredRosters());

    const stored = allRosters.find((r) => r.registrationId === registrationId);
    if (stored) {
      // Validate that it belongs to this club slug
      if (slugify(stored.clubName) !== clubSlug) return null;
      return { ...stored, coachName: stored.coachName ?? "", coachPhone: stored.coachPhone ?? "" };
    }

    // No stored roster — build placeholder from registration
    const reg = allRegs.find((r) => r.id === registrationId);
    if (!reg) return null;
    if (slugify(reg.clubName || reg.teamName) !== clubSlug) return null;

    return {
      id: `placeholder-${reg.id}`,
      registrationId: reg.id,
      clubName: reg.clubName || reg.teamName,
      teamName: reg.teamName,
      tournamentSlug: reg.tournamentSlug,
      tournamentName: reg.tournamentName,
      categoryId: reg.categoryId,
      divisionLabel: reg.divisionLabel,
      coachName: "",
      coachPhone: "",
      players: [],
      createdAt: reg.registeredAt,
      updatedAt: reg.registeredAt,
    };
  }, [clubSlug, registrationId, revision]);

  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [coachName, setCoachName] = useState("");
  const [coachPhone, setCoachPhone] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (baseRoster) {
      setPlayers(baseRoster.players);
      setCoachName(baseRoster.coachName);
      setCoachPhone(baseRoster.coachPhone);
    }
  }, [baseRoster]);

  const handleAddRow = useCallback(() => {
    setPlayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), fullName: "", jerseyNumber: "", position: "" },
    ]);
  }, []);

  const handleRemoveRow = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleChangePlayer = useCallback(
    (id: string, field: keyof RosterPlayer, value: string) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
      );
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!baseRoster) return;
    const isPlaceholder = baseRoster.id.startsWith("placeholder-");
    upsertStoredRoster({
      ...baseRoster,
      id: isPlaceholder ? `roster-${crypto.randomUUID()}` : baseRoster.id,
      coachName,
      coachPhone,
      players,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }, [baseRoster, coachName, coachPhone, players]);

  // ── not found ─────────────────────────────────────────────────────────────
  if (!baseRoster) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Equipo no encontrado
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No existe ningún equipo con ese ID bajo este club.
        </p>
        <Link
          href={`/admin/equipos/${encodeURIComponent(clubSlug)}`}
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Volver al club
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8">
      {/* breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/equipos" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          Equipos
        </Link>
        <span className="text-zinc-400">/</span>
        <Link
          href={`/admin/equipos/${encodeURIComponent(clubSlug)}`}
          className="text-zinc-500 hover:underline"
        >
          {baseRoster.clubName}
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-500">{baseRoster.teamName}</span>
      </nav>

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {baseRoster.teamName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {baseRoster.divisionLabel}
            {baseRoster.tournamentName ? ` · ${baseRoster.tournamentName}` : ""}
          </p>
        </div>
        <Link
          href={`/admin/registrations/${encodeURIComponent(registrationId)}`}
          className="text-xs font-medium text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Ver inscripción →
        </Link>
      </div>

      {/* coach info */}
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Contacto del equipo</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Nombre del coach</span>
            <input
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Nombre completo"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Teléfono del coach</span>
            <input
              value={coachPhone}
              onChange={(e) => setCoachPhone(e.target.value)}
              placeholder="787-000-0000"
              inputMode="tel"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>
      </section>

      {/* roster table */}
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Jugadores ({players.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/60">
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600 dark:text-zinc-400">#</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600 dark:text-zinc-400">Nombre completo</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600 dark:text-zinc-400">Camiseta</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600 dark:text-zinc-400">Posición</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-zinc-400">
                    Roster vacío — agrega jugadores con el botón de abajo.
                  </td>
                </tr>
              ) : (
                players.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 text-zinc-400">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <input
                        value={p.fullName}
                        onChange={(e) => handleChangePlayer(p.id, "fullName", e.target.value)}
                        placeholder="Nombre y apellido"
                        className="w-full min-w-[10rem] rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        value={p.jerseyNumber ?? ""}
                        onChange={(e) => handleChangePlayer(p.id, "jerseyNumber", e.target.value)}
                        placeholder="00"
                        className="w-16 rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        value={p.position ?? ""}
                        onChange={(e) => handleChangePlayer(p.id, "position", e.target.value)}
                        placeholder="Ej. Líbero"
                        className="w-28 rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(p.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Quitar jugador"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleAddRow}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            + Agregar jugador
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Guardar roster
          </button>
          {saved ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Guardado.</span>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function RosterDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-zinc-500">Cargando…</p>
        </main>
      }
    >
      <RosterDetailInner />
    </Suspense>
  );
}
