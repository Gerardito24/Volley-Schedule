"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminRole } from "@/lib/types";
import { btnDanger, btnPrimary, btnSecondary, card, inputClass, labelClass } from "./ui";

export interface Operator {
  id: string;
  username: string;
  displayName: string;
  position: string;
  role: AdminRole;
  createdAt: string;
}

interface Props {
  operators: Operator[];
  actor: { id: string; role: AdminRole };
}

type FormMode = { kind: "create" } | { kind: "edit"; op: Operator } | null;

const emptyFields = { displayName: "", position: "", username: "", password: "" };

function RoleBadge({ role }: { role: AdminRole }) {
  if (role === "it_master") {
    return (
      <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
        IT Master
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
      Administrador
    </span>
  );
}

export default function AdminOperatorsManager({ operators, actor }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>(null);
  const [fields, setFields] = useState(emptyFields);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function canEdit(op: Operator): boolean {
    if (op.role === "it_master") return actor.id === op.id;
    return true;
  }
  function canDelete(op: Operator): boolean {
    return op.role !== "it_master";
  }

  function openCreate() {
    setFields(emptyFields);
    setError(null);
    setMode({ kind: "create" });
  }

  function openEdit(op: Operator) {
    setFields({
      displayName: op.displayName,
      position: op.position,
      username: op.username,
      password: "",
    });
    setError(null);
    setMode({ kind: "edit", op });
  }

  function closeForm() {
    setMode(null);
    setError(null);
  }

  async function submit() {
    if (!mode) return;
    setBusy(true);
    setError(null);
    try {
      const isCreate = mode.kind === "create";
      const url = isCreate ? "/api/admin/operators" : `/api/admin/operators/${mode.op.id}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar. Intenta de nuevo.");
        return;
      }
      closeForm();
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(op: Operator) {
    if (!confirm(`¿Eliminar el perfil de ${op.displayName} (@${op.username})?`)) return;
    setDeletingId(op.id);
    try {
      const res = await fetch(`/api/admin/operators/${op.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        alert(data?.error ?? "No se pudo eliminar.");
        return;
      }
      router.refresh();
    } catch {
      alert("Error de conexión. Intenta de nuevo.");
    } finally {
      setDeletingId(null);
    }
  }

  const editingItMaster = mode?.kind === "edit" && mode.op.role === "it_master";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {operators.length} {operators.length === 1 ? "perfil" : "perfiles"}
        </p>
        <button type="button" className={btnPrimary} onClick={openCreate}>
          + Nuevo administrador
        </button>
      </div>

      {/* Formulario crear/editar */}
      {mode && (
        <div className={`${card} p-6`}>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            {mode.kind === "create"
              ? "Nuevo administrador"
              : editingItMaster
                ? "Editar mi perfil (IT Master)"
                : `Editar ${mode.op.displayName}`}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre completo</label>
              <input
                className={inputClass}
                value={fields.displayName}
                onChange={(e) => setFields((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Posición</label>
              <input
                className={inputClass}
                placeholder="Coordinador, IT, etc."
                value={fields.position}
                onChange={(e) => setFields((f) => ({ ...f, position: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Usuario</label>
              <input
                className={inputClass}
                autoComplete="off"
                value={fields.username}
                onChange={(e) => setFields((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>
                Contraseña{" "}
                {mode.kind === "edit" && (
                  <span className="text-zinc-400">(dejar en blanco para mantener)</span>
                )}
              </label>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                placeholder={mode.kind === "edit" ? "••••••••" : "Mínimo 6 caracteres"}
                value={fields.password}
                onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <button type="button" className={btnPrimary} onClick={submit} disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className={btnSecondary} onClick={closeForm} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de perfiles */}
      <div className={`${card} overflow-hidden`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Posición</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {operators.map((op) => {
              const isSelf = op.id === actor.id;
              return (
                <tr key={op.id} className="text-zinc-800">
                  <td className="px-4 py-3 font-medium">
                    {op.displayName}
                    {isSelf && <span className="ml-2 text-xs text-indigo-600">(tú)</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{op.position}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600">{op.username}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={op.role} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canEdit(op) ? (
                        <button
                          type="button"
                          className={`${btnSecondary} px-3 py-1.5`}
                          onClick={() => openEdit(op)}
                        >
                          Editar
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">Protegido</span>
                      )}
                      {canDelete(op) && (
                        <button
                          type="button"
                          className={`${btnDanger} px-3 py-1.5`}
                          onClick={() => remove(op)}
                          disabled={deletingId === op.id}
                        >
                          {deletingId === op.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-400">
        El perfil <strong>IT Master</strong> no se puede eliminar y solo puede editarlo su propio
        usuario.
      </p>
    </div>
  );
}
