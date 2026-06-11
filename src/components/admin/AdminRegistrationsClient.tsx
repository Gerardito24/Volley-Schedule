"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MergedRegistrationsTable } from "@/components/MergedRegistrationsTable";
import { Button, PageHeader } from "@/components/admin/ui";
import { useMergedTournaments } from "@/hooks/use-merged-tournaments";

export function AdminRegistrationsClient() {
  const tournaments = useMergedTournaments();
  const [tournamentFilter, setTournamentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const tournamentOptions = useMemo(
    () => [...tournaments].sort((a, b) => a.name.localeCompare(b.name)),
    [tournaments],
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Inscripciones"
        description="Consulta, edita y exporta inscripciones. Usa el botón de editar en cada fila para cambiar datos."
        actions={
          <Link href="/admin/registrations/import">
            <Button variant="secondary">Importar CSV / Excel</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold text-zinc-600">
          Torneo
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal"
          >
            <option value="">Todos los torneos</option>
            {tournamentOptions.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[160px] flex-col gap-1 text-xs font-semibold text-zinc-600">
          Estado
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal"
          >
            <option value="all">Todos</option>
            <option value="pending_payment">Pago pendiente</option>
            <option value="paid">Pagado</option>
            <option value="approved">Aprobado</option>
            <option value="under_review">En revisión</option>
            <option value="rejected">Rechazado</option>
          </select>
        </label>
      </div>

      <MergedRegistrationsTable
        tournamentSlug={tournamentFilter || undefined}
        statusFilter={statusFilter === "all" ? undefined : statusFilter}
      />
    </main>
  );
}
