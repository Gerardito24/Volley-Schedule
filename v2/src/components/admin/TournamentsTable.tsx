"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TournamentStatus } from "@/lib/types";
import { formatDateRangeEs } from "@/lib/types";
import { TournamentStatusChip } from "./StatusChip";
import { card, inputClass } from "./ui";
import ActionsMenu from "./ActionsMenu";
import ConfirmDialog from "./ConfirmDialog";

export interface TournamentRow {
  slug: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: TournamentStatus;
  categoriesCount: number;
  registrationsCount: number;
  schedulePublished: boolean;
}

type StatusFilter = "todos" | TournamentStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "open", label: "Abierto" },
  { value: "closed", label: "Cerrado" },
];

export default function TournamentsTable({ tournaments }: { tournaments: TournamentRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [deleteTarget, setDeleteTarget] = useState<TournamentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteTournament() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${deleteTarget.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo eliminar el torneo.");
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tournaments.filter((t) => {
      if (status !== "todos" && t.status !== status) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tournaments, query, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre…"
          className={`${inputClass} sm:max-w-xs`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className={`${inputClass} sm:max-w-[180px]`}
          aria-label="Filtrar por estado"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="font-medium text-zinc-900">No hay torneos que coincidan</p>
          <p className="mt-1 text-sm text-zinc-500">
            Ajusta la búsqueda o crea un torneo nuevo.
          </p>
        </div>
      ) : (
        <div className={`${card} thin-scroll overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 font-medium">Torneo</th>
                <th className="px-4 py-3 font-medium">Fechas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Categorías</th>
                <th className="px-4 py-3 font-medium">Inscripciones</th>
                <th className="px-4 py-3 font-medium">Itinerario</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.slug} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/torneos/${t.slug}`}
                      className="font-medium text-zinc-900 hover:text-indigo-600"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {formatDateRangeEs(t.startsOn, t.endsOn)}
                  </td>
                  <td className="px-4 py-3">
                    <TournamentStatusChip status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{t.categoriesCount}</td>
                  <td className="px-4 py-3 text-zinc-500">{t.registrationsCount}</td>
                  <td className="px-4 py-3">
                    {t.schedulePublished ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        Publicado
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">Sin publicar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionsMenu
                      actions={[
                        {
                          label: "Abrir torneo",
                          onSelect: () => router.push(`/admin/torneos/${t.slug}`),
                        },
                        {
                          label: "Creador de itinerario",
                          onSelect: () => router.push(`/admin/torneos/${t.slug}/itinerario`),
                        },
                        {
                          label: "Eliminar torneo",
                          danger: true,
                          onSelect: () => setDeleteTarget(t),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar torneo"
        description={
          deleteTarget
            ? `Se eliminará "${deleteTarget.name}" con sus ${deleteTarget.registrationsCount} inscripciones, rosters e itinerario. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar torneo"
        busy={deleting}
        onConfirm={deleteTournament}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
