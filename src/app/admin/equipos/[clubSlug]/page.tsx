"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { readStoredRegistrations, LOCAL_REGISTRATIONS_KEY } from "@/lib/local-registrations";
import {
  readStoredRosters,
  upsertStoredRoster,
  LOCAL_ROSTERS_KEY,
} from "@/lib/local-team-rosters";
import type { TeamRoster, RosterPlayer } from "@/lib/team-roster-types";
import { mergeAdminRegistrations } from "@/lib/merge-registrations";
import { registrationRows as seedRows } from "@/lib/mock-data";
import { slugify } from "@/lib/slugify";

function ClubDetailInner() {
  const params = useParams();
  const rawSlug = params.clubSlug;
  const clubSlug =
    typeof rawSlug === "string"
      ? decodeURIComponent(rawSlug)
      : Array.isArray(rawSlug)
        ? decodeURIComponent(rawSlug[0] ?? "")
        : "";

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((x) => x + 1);
    window.addEventListener("volleyschedule-registrations-changed", bump);
    window.addEventListener("volleyschedule-rosters-changed", bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_REGISTRATIONS_KEY || e.key === LOCAL_ROSTERS_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("volleyschedule-registrations-changed", bump);
      window.removeEventListener("volleyschedule-rosters-changed", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const { clubName, rosters } = useMemo(() => {
    const allRegs = mergeAdminRegistrations(seedRows, readStoredRegistrations());
    const allRosters = readStoredRosters();

    // Find all registrations for this club
    const clubRegs = allRegs.filter(
      (r) => slugify(r.clubName || r.teamName) === clubSlug,
    );

    const firstName = clubRegs[0]?.clubName ?? clubSlug;

    // Match rosters to registrations; create placeholder roster rows for
    // registrations that don't have a roster yet (shows them as empty)
    const result: TeamRoster[] = [];
    for (const reg of clubRegs) {
      const existing = allRosters.find((r) => r.registrationId === reg.id);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          id: `placeholder-${reg.id}`,
          registrationId: reg.id,
          clubName: reg.clubName || reg.teamName,
          teamName: reg.teamName,
          tournamentSlug: reg.tournamentSlug,
          tournamentName: reg.tournamentName,
          categoryId: reg.categoryId,
          divisionLabel: reg.divisionLabel,
          players: [],
          createdAt: reg.registeredAt,
          updatedAt: reg.registeredAt,
        });
      }
    }

    // Also include orphan rosters for this club
    for (const r of allRosters) {
      if (
        slugify(r.clubName) === clubSlug &&
        !result.find((x) => x.registrationId === r.registrationId)
      ) {
        result.push(r);
      }
    }

    return {
      clubName: firstName,
      rosters: result.sort((a, b) =>
        a.divisionLabel.localeCompare(b.divisionLabel, "es"),
      ),
    };
  }, [clubSlug, revision]);

  if (rosters.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Club no encontrado
        </h2>
        <Link href="/admin/equipos" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          ← Volver a equipos
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/equipos" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          ← Equipos
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-sm text-zinc-500">{clubName}</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {clubName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {rosters.length} {rosters.length === 1 ? "categoría" : "categorías"} · Roster por categoría editable abajo
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {rosters.map((roster) => (
          <RosterCard key={roster.id} roster={roster} />
        ))}
      </div>
    </main>
  );
}

function RosterCard({ roster }: { roster: TeamRoster }) {
  const isPlaceholder = roster.id.startsWith("placeholder-");
  const [players, setPlayers] = useState<RosterPlayer[]>(roster.players);
  const [saved, setSaved] = useState(false);

  const handleAddRow = useCallback(() => {
    setPlayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), fullName: "", jerseyNumber: "", position: "" },
    ]);
  }, []);

  const handleRemoveRow = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleChange = useCallback(
    (id: string, field: keyof RosterPlayer, value: string) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
      );
    },
    [],
  );

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    upsertStoredRoster({
      ...roster,
      id: isPlaceholder ? `roster-${crypto.randomUUID()}` : roster.id,
      players,
      updatedAt: now,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }, [roster, players, isPlaceholder]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {roster.teamName}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {roster.divisionLabel} · {roster.tournamentName}
          </p>
        </div>
        <Link
          href={`/admin/registrations/${encodeURIComponent(roster.registrationId)}`}
          className="text-xs font-medium text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Ver inscripción →
        </Link>
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
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-400">
                  Roster vacío — agrega jugadores abajo.
                </td>
              </tr>
            ) : (
              players.map((p, idx) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 text-zinc-400">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <input
                      value={p.fullName}
                      onChange={(e) => handleChange(p.id, "fullName", e.target.value)}
                      placeholder="Nombre y apellido"
                      className="w-full min-w-[9rem] rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      value={p.jerseyNumber ?? ""}
                      onChange={(e) => handleChange(p.id, "jerseyNumber", e.target.value)}
                      placeholder="00"
                      className="w-16 rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      value={p.position ?? ""}
                      onChange={(e) => handleChange(p.id, "position", e.target.value)}
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
  );
}

export default function ClubDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-zinc-500">Cargando…</p>
        </main>
      }
    >
      <ClubDetailInner />
    </Suspense>
  );
}
