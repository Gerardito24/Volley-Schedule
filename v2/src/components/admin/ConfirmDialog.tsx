"use client";

import { btnDanger, btnSecondary } from "./ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-950/40"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className={btnDanger} onClick={onConfirm} disabled={busy}>
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
