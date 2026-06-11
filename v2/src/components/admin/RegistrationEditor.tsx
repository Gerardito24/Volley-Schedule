"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalStatus, PaymentStatus } from "@/lib/types";
import { APPROVAL_STATUS_LABELS } from "@/lib/types";
import { btnPrimary, card, inputClass, labelClass } from "./ui";

interface RegistrationEditorProps {
  registrationId: string;
  initialApproval: ApprovalStatus;
  initialPaymentStatus: PaymentStatus;
  initialTeamName: string;
  initialFeeCents: number;
  initialComments: string;
}

const APPROVAL_ENTRIES = Object.entries(APPROVAL_STATUS_LABELS) as [
  ApprovalStatus,
  string,
][];

export default function RegistrationEditor({
  registrationId,
  initialApproval,
  initialPaymentStatus,
  initialTeamName,
  initialFeeCents,
  initialComments,
}: RegistrationEditorProps) {
  const router = useRouter();
  const [approval, setApproval] = useState<ApprovalStatus>(initialApproval);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(initialPaymentStatus);
  const [teamName, setTeamName] = useState(initialTeamName);
  const [feeUsd, setFeeUsd] = useState(String(initialFeeCents / 100));
  const [comments, setComments] = useState(initialComments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    setError(null);

    if (!teamName.trim()) {
      setError("El nombre del equipo es requerido.");
      return;
    }
    const fee = Number(feeUsd);
    if (feeUsd.trim() === "" || Number.isNaN(fee) || fee < 0) {
      setError("La tarifa no es válida.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval,
          paymentStatus,
          teamName: teamName.trim(),
          feeCents: Math.round(fee * 100),
          comments: comments.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudieron guardar los cambios.");
        return;
      }
      setMessage("Cambios guardados.");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${card} p-6`}>
      <h2 className="text-lg font-semibold text-zinc-900">Editar inscripción</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Aprobación (¿puede jugar?)</label>
          <select
            value={approval}
            onChange={(e) => setApproval(e.target.value as ApprovalStatus)}
            className={inputClass}
          >
            {APPROVAL_ENTRIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Pago</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                paymentStatus === "paid"
                  ? "border-sky-400 bg-sky-50 text-sky-800"
                  : "border-zinc-300 text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              ✓ Pagado
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus("unpaid")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                paymentStatus === "unpaid"
                  ? "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-zinc-300 text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              Debe
            </button>
          </div>
        </div>
        <div>
          <label className={labelClass}>Nombre del equipo</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Tarifa (USD)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={feeUsd}
            onChange={(e) => setFeeUsd(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Comentarios</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Notas internas o del club…"
          />
        </div>
      </div>

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
  );
}
