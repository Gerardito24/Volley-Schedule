"use client";

import { useEffect, useState } from "react";
import type { RegistrationRowMock } from "@/lib/mock-data";
import { upsertStoredRegistration } from "@/lib/local-registrations";
import { downloadRegistrationPdf } from "@/lib/registrationPdf";

const statusLabels: Record<RegistrationRowMock["status"], string> = {
  draft: "Borrador",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  under_review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  waitlisted: "Lista de espera",
};

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

export function RegistrationSheet({
  row,
  open,
  onClose,
  onSaved,
}: {
  row: RegistrationRowMock | null;
  open: boolean;
  onClose: () => void;
  /** Actualiza la fila abierta en el padre tras guardar (misma referencia lógica). */
  onSaved?: (next: RegistrationRowMock) => void;
}) {
  const [draft, setDraft] = useState<RegistrationRowMock | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!row) {
      setDraft(null);
      return;
    }
    setDraft({ ...row });
    setFeeInput(centsToInput(row.feeCents));
  }, [row]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !row || !draft) return null;

  function handleSave() {
    if (!draft) return;
    const feeParsed = dollarsToCents(feeInput);
    const next: RegistrationRowMock = {
      id: draft.id,
      tournamentSlug: draft.tournamentSlug,
      tournamentName: draft.tournamentName,
      divisionLabel: draft.divisionLabel,
      teamName: draft.teamName,
      clubName: draft.clubName ?? draft.teamName,
      status: draft.status,
      updatedAt: new Date().toISOString().slice(0, 10),
      feeCents: feeParsed ?? draft.feeCents,
      registeredAt: draft.registeredAt,
      categoryId: draft.categoryId,
      subdivisionId: draft.subdivisionId ?? null,
    };
    upsertStoredRegistration(next);
    setDraft(next);
    setFeeInput(centsToInput(next.feeCents));
    onSaved?.(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar panel"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-sheet-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="registration-sheet-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Hoja de inscripción
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{draft.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Cerrar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4 text-sm">
            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Torneo</span>
              <input
                value={draft.tournamentName}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, tournamentName: e.target.value } : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Club</span>
              <input
                value={draft.clubName ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, clubName: e.target.value } : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">División</span>
              <input
                value={draft.divisionLabel}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, divisionLabel: e.target.value } : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Equipo</span>
              <input
                value={draft.teamName}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, teamName: e.target.value } : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Estado</span>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          status: e.target
                            .value as RegistrationRowMock["status"],
                        }
                      : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {(Object.keys(statusLabels) as RegistrationRowMock["status"][]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">
                Tarifa (USD)
              </span>
              <input
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">
                Actualizado (fecha)
              </span>
              <input
                type="date"
                value={draft.updatedAt}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, updatedAt: e.target.value } : d,
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Slug:
                </span>{" "}
                {draft.tournamentSlug}
              </p>
              <p className="mt-1">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Registrado:
                </span>{" "}
                {draft.registeredAt}
              </p>
            </div>
          </div>
        </div>

        <footer className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => downloadRegistrationPdf(draft)}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Exportar PDF
            </button>
            {savedFlash ? (
              <span className="self-center text-sm text-emerald-600 dark:text-emerald-400">
                Guardado.
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            En la tabla podés usar doble clic en una celda para editar rápido.
          </p>
        </footer>
      </aside>
    </div>
  );
}
