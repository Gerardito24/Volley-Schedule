"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RegistrationRowMock } from "@/lib/mock-data";
import { upsertStoredRegistration } from "@/lib/local-registrations";
import { downloadRegistrationPdf } from "@/lib/registrationPdf";
import { RegistrationSheet } from "@/components/RegistrationSheet";

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

type EditableField =
  | "tournamentName"
  | "divisionLabel"
  | "teamName"
  | "feeCents"
  | "updatedAt";

function dollarsToCents(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function centsToInput(c: number): string {
  return (c / 100).toFixed(2);
}

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
  allowLocalStatusEdit,
  registrationTools,
}: {
  rows: RegistrationRowMock[];
  hideTournamentColumn?: boolean;
  /** Demo: guardar nuevo estado en localStorage y refrescar tablas mergeadas. */
  allowLocalStatusEdit?: boolean;
  /** Hoja lateral, PDF por fila, doble clic para editar celdas. */
  registrationTools?: boolean;
}) {
  const tools = Boolean(registrationTools);

  const [sheetRow, setSheetRow] = useState<RegistrationRowMock | null>(null);
  const [editing, setEditing] = useState<{
    rowId: string;
    field: EditableField;
  } | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const csvBlobUrl = useMemo(() => {
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [rows]);

  useEffect(() => {
    return () => URL.revokeObjectURL(csvBlobUrl);
  }, [csvBlobUrl]);

  const beginEdit = useCallback(
    (r: RegistrationRowMock, field: EditableField) => {
      if (!tools) return;
      if (field === "tournamentName" && hideTournamentColumn) return;
      setEditing({ rowId: r.id, field });
      if (field === "feeCents") setEditDraft(centsToInput(r.feeCents));
      else if (field === "updatedAt") setEditDraft(r.updatedAt);
      else if (field === "tournamentName") setEditDraft(r.tournamentName);
      else if (field === "divisionLabel") setEditDraft(r.divisionLabel);
      else setEditDraft(r.teamName);
    },
    [hideTournamentColumn, tools],
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const r = rows.find((x) => x.id === editing.rowId);
    if (!r) {
      setEditing(null);
      return;
    }
    let patch: Partial<RegistrationRowMock> = {};
    if (editing.field === "feeCents") {
      const c = dollarsToCents(editDraft);
      if (c === null) {
        setEditing(null);
        return;
      }
      patch.feeCents = c;
    } else if (editing.field === "updatedAt") {
      patch.updatedAt = editDraft.trim() || r.updatedAt;
    } else if (editing.field === "tournamentName") {
      patch.tournamentName = editDraft.trim() || r.tournamentName;
    } else if (editing.field === "divisionLabel") {
      patch.divisionLabel = editDraft.trim() || r.divisionLabel;
    } else {
      patch.teamName = editDraft.trim() || r.teamName;
    }
    upsertStoredRegistration({
      ...r,
      ...patch,
      updatedAt:
        editing.field === "updatedAt"
          ? (patch.updatedAt as string)
          : new Date().toISOString().slice(0, 10),
    });
    setEditing(null);
  }, [editDraft, editing, rows]);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const renderEditableCell = useCallback(
    (
      r: RegistrationRowMock,
      field: EditableField,
      display: React.ReactNode,
      className: string,
    ) => {
      const active =
        tools && editing?.rowId === r.id && editing.field === field;
      return (
        <td
          className={`${className} ${tools ? "cursor-cell" : ""}`}
          title={
            tools
              ? "Doble clic para editar"
              : undefined
          }
          onDoubleClick={(e) => {
            e.preventDefault();
            beginEdit(r, field);
          }}
        >
          {active ? (
            <input
              autoFocus
              type={field === "updatedAt" ? "date" : "text"}
              inputMode={field === "feeCents" ? "decimal" : undefined}
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className={`w-full min-w-[8rem] rounded border border-emerald-500 bg-white px-2 py-1 text-sm dark:bg-zinc-950 ${
                field === "feeCents" ? "text-right" : ""
              }`}
            />
          ) : (
            display
          )}
        </td>
      );
    },
    [beginEdit, cancelEdit, commitEdit, editDraft, editing, tools],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Demo: datos seed + inscripciones guardadas en este navegador. Conectar
          Supabase en una siguiente iteración.
          {tools ? (
            <>
              {" "}
              <strong>Doble clic</strong> en torneo/división/equipo/tarifa/fecha
              para editar. <strong>Abrir</strong> muestra la hoja completa.
            </>
          ) : null}
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
              {tools ? (
                <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Hoja
                </th>
              ) : null}
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
              {allowLocalStatusEdit ? (
                <th className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Cambiar (local)
                </th>
              ) : null}
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
              <tr key={r.id} className={tools ? "hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40" : ""}>
                {tools ? (
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() => setSheetRow(r)}
                        className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadRegistrationPdf(r)}
                        className="rounded-lg border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                      >
                        PDF
                      </button>
                    </div>
                  </td>
                ) : null}
                {!hideTournamentColumn
                  ? renderEditableCell(
                      r,
                      "tournamentName",
                      r.tournamentName,
                      "whitespace-nowrap px-4 py-3 text-zinc-900 dark:text-zinc-100",
                    )
                  : null}
                {renderEditableCell(
                  r,
                  "divisionLabel",
                  r.divisionLabel,
                  "whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300",
                )}
                {renderEditableCell(
                  r,
                  "teamName",
                  r.teamName,
                  "whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300",
                )}
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {statusLabels[r.status]}
                </td>
                {allowLocalStatusEdit ? (
                  <td
                    className="whitespace-nowrap px-4 py-3"
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <select
                      aria-label={`Estado para ${r.teamName}`}
                      value={r.status}
                      onChange={(e) => {
                        const status = e.target.value as RegistrationRowMock["status"];
                        upsertStoredRegistration({
                          ...r,
                          status,
                          updatedAt: new Date().toISOString().slice(0, 10),
                        });
                      }}
                      className="max-w-[11rem] rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-950"
                    >
                      {(Object.keys(statusLabels) as RegistrationRowMock["status"][]).map(
                        (s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                ) : null}
                {renderEditableCell(
                  r,
                  "feeCents",
                  formatMoney(r.feeCents),
                  "whitespace-nowrap px-4 py-3 text-right text-zinc-900 dark:text-zinc-100",
                )}
                {renderEditableCell(
                  r,
                  "updatedAt",
                  r.updatedAt,
                  "whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400",
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tools ? (
        <RegistrationSheet
          row={sheetRow}
          open={sheetRow != null}
          onClose={() => setSheetRow(null)}
          onSaved={(next) => setSheetRow(next)}
        />
      ) : null}
    </div>
  );
}
