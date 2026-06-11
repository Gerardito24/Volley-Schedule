"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApprovalStatus, PaymentStatus } from "@/lib/types";
import {
  APPROVAL_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDateEs,
  formatUsd,
} from "@/lib/types";
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
  approval: ApprovalStatus;
  paymentStatus: PaymentStatus;
}

interface RegistrationsTableProps {
  registrations: RegistrationRow[];
  tournaments?: { slug: string; name: string }[];
  showTournamentFilter?: boolean;
}

const APPROVAL_ENTRIES = Object.entries(APPROVAL_STATUS_LABELS) as [
  ApprovalStatus,
  string,
][];

const APPROVAL_SELECT_STYLES: Record<ApprovalStatus, string> = {
  pending: "border-violet-300 bg-violet-50 text-violet-800",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  rejected: "border-red-300 bg-red-50 text-red-800",
  waitlisted: "border-zinc-300 bg-zinc-50 text-zinc-600",
};

export default function RegistrationsTable({
  registrations,
  tournaments = [],
  showTournamentFilter = false,
}: RegistrationsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("todos");
  const [approvalFilter, setApprovalFilter] = useState<"todos" | ApprovalStatus>("todos");
  const [paymentFilter, setPaymentFilter] = useState<"todos" | PaymentStatus>("todos");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter((r) => {
      if (tournamentFilter !== "todos" && r.tournamentSlug !== tournamentFilter) return false;
      if (approvalFilter !== "todos" && r.approval !== approvalFilter) return false;
      if (paymentFilter !== "todos" && r.paymentStatus !== paymentFilter) return false;
      if (
        q &&
        !r.clubName.toLowerCase().includes(q) &&
        !r.teamName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [registrations, query, tournamentFilter, approvalFilter, paymentFilter]);

  async function patch(id: string, body: Record<string, unknown>) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo actualizar.");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
            className={`${inputClass} sm:max-w-[220px]`}
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
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value as "todos" | ApprovalStatus)}
          className={`${inputClass} sm:max-w-[180px]`}
          aria-label="Filtrar por aprobación"
        >
          <option value="todos">Aprobación: todas</option>
          {APPROVAL_ENTRIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as "todos" | PaymentStatus)}
          className={`${inputClass} sm:max-w-[160px]`}
          aria-label="Filtrar por pago"
        >
          <option value="todos">Pago: todos</option>
          <option value="paid">{PAYMENT_STATUS_LABELS.paid}</option>
          <option value="unpaid">{PAYMENT_STATUS_LABELS.unpaid}</option>
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 font-medium">Equipo / Club</th>
                <th className="px-4 py-3 font-medium">Torneo</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tarifa</th>
                <th className="px-4 py-3 font-medium">Aprobación</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium" />
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
                    <select
                      value={r.approval}
                      disabled={busyId === r.id}
                      onChange={(e) => void patch(r.id, { approval: e.target.value })}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none disabled:opacity-50 ${APPROVAL_SELECT_STYLES[r.approval]}`}
                      aria-label="Cambiar aprobación"
                    >
                      {APPROVAL_ENTRIES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() =>
                        void patch(r.id, {
                          paymentStatus: r.paymentStatus === "paid" ? "unpaid" : "paid",
                        })
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        r.paymentStatus === "paid"
                          ? "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100"
                          : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      }`}
                      title="Click para alternar el estado de pago"
                    >
                      {r.paymentStatus === "paid" ? "✓ Pagado" : "Debe"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/inscripciones/${r.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Ver
                    </Link>
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
