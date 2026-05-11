"use client";

import { useEffect, useMemo } from "react";
import type { RegistrationRowMock } from "@/lib/mock-data";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const statusLabels: Record<RegistrationRowMock["status"], string> = {
  draft: "Borrador",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  under_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  waitlisted: "Lista de espera",
};

function rowsToCsv(rows: RegistrationRowMock[]) {
  const header = [
    "id",
    "tournament",
    "division",
    "team",
    "status",
    "fee_usd",
    "updated_at",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.tournamentName,
      r.divisionLabel,
      r.teamName,
      r.status,
      (r.feeCents / 100).toFixed(2),
      r.updatedAt,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}

export function RegistrationTable({
  rows,
  hideTournamentColumn,
}: {
  rows: RegistrationRowMock[];
  hideTournamentColumn?: boolean;
}) {
  const csvBlobUrl = useMemo(() => {
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [rows]);

  useEffect(() => {
    return () => URL.revokeObjectURL(csvBlobUrl);
  }, [csvBlobUrl]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Vista previa con datos mock. Conectar Supabase en una siguiente iteración.
        </p>
        <a
          href={csvBlobUrl}
          download="registrations-export.csv"
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Exportar CSV
        </a>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              {!hideTournamentColumn ? (
                <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Torneo
                </th>
              ) : null}
              <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                División
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                Equipo
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                Estado
              </th>
              <th className="px-4 py-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                Tarifa
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                Actualizado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {rows.map((r) => (
              <tr key={r.id}>
                {!hideTournamentColumn ? (
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-900 dark:text-zinc-100">
                    {r.tournamentName}
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {r.divisionLabel}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {r.teamName}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {statusLabels[r.status]}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                  {formatMoney(r.feeCents)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {r.updatedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
