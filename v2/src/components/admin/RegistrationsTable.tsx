"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RegistrationStatus } from "@/lib/types";
import { REGISTRATION_STATUS_LABELS, formatDateEs, formatUsd } from "@/lib/types";
import { RegistrationStatusChip } from "./StatusChip";
import { card, inputClass } from "./ui";

export interface RegistrationRow {
  id: string;
  clubName: string;
  teamName: string;
  tournamentSlug: string;
  tournamentName: string;
  categoryLabel: string;
  registeredAt: string; // ISO
  feeCents: number;
  status: RegistrationStatus;
}

interface RegistrationsTableProps {
  registrations: RegistrationRow[];
  tournaments?: { slug: string; name: string }[];
  showTournamentFilter?: boolean;
}

const STATUS_ENTRIES = Object.entries(REGISTRATION_STATUS_LABELS) as [
  RegistrationStatus,
  string,
][];

export default function RegistrationsTable({
  registrations,
  tournaments = [],
  showTournamentFilter = false,
}: RegistrationsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | RegistrationStatus>("todos");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter((r) => {
      if (tournamentFilter !== "todos" && r.tournamentSlug !== tournamentFilter) return false;
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      if (
        q &&
        !r.clubName.toLowerCase().includes(q) &&
        !r.teamName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [registrations, query, tournamentFilter, statusFilter]);

  async function changeStatus(id: string, status: RegistrationStatus) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo actualizar el estado.");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar club o equipo…"
          className={`${inputClass} sm:max-w-xs`}
        />
        {showTournamentFilter && (
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className={`${inputClass} sm:max-w-[240px]`}
            aria-label="Filtrar por torneo"
          >
            <option value="todos">Todos los torneos</option>
            {tournaments.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "todos" | RegistrationStatus)}
          className={`${inputClass} sm:max-w-[200px]`}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          {STATUS_ENTRIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="font-medium text-zinc-900">No hay inscripciones que coincidan</p>
          <p className="mt-1 text-sm text-zinc-500">Ajusta los filtros para ver resultados.</p>
        </div>
      ) : (
        <div className={`${card} thin-scroll overflow-x-auto`}>
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 font-medium">Equipo / Club</th>
                <th className="px-4 py-3 font-medium">Torneo</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tarifa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{r.teamName}</p>
                    <p className="text-xs text-zinc-500">{r.clubName}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{r.tournamentName}</td>
                  <td className="px-4 py-3 text-zinc-500">{r.categoryLabel}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {formatDateEs(r.registeredAt.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatUsd(r.feeCents)}</td>
                  <td className="px-4 py-3">
                    <RegistrationStatusChip status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={r.status}
                        disabled={busyId === r.id}
                        onChange={(e) =>
                          changeStatus(r.id, e.target.value as RegistrationStatus)
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        aria-label="Cambiar estado"
                      >
                        {STATUS_ENTRIES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Link
                        href={`/admin/inscripciones/${r.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
