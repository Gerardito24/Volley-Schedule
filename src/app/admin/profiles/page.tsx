"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminOperator, AdminOperatorPublic } from "@/lib/admin-operator-types";
import {
  IT_MASTER_DISPLAY_NAME,
  IT_MASTER_POSITION,
  IT_MASTER_PROFILE_ID,
} from "@/lib/admin-operator-types";
import {
  addAdministrator,
  deleteOperator,
  getCurrentOperator,
  listOperatorsPublic,
  updateOperator,
} from "@/lib/admin-operators-store";

export default function AdminProfilesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminOperatorPublic[]>([]);
  const [actor, setActor] = useState<AdminOperator | null>(() =>
    typeof window !== "undefined" ? getCurrentOperator() : null,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setActor(getCurrentOperator());
    setRows(listOperatorsPublic());
  }, []);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("volleyschedule-admin-operators-changed", on);
    window.addEventListener("volleyschedule-admin-session-changed", on);
    return () => {
      window.removeEventListener("volleyschedule-admin-operators-changed", on);
      window.removeEventListener("volleyschedule-admin-session-changed", on);
    };
  }, [refresh]);

  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cPos, setCPos] = useState("");
  const [cUser, setCUser] = useState("");
  const [cPass, setCPass] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [ePos, setEPos] = useState("");
  const [eUser, setEUser] = useState("");
  const [ePass, setEPass] = useState("");
  const [eOrgEmail, setEOrgEmail] = useState("");

  if (!actor) {
    return (
      <div className="text-sm text-zinc-500">Cargando sesión…</div>
    );
  }

  function openEdit(p: AdminOperatorPublic) {
    setEditId(p.id);
    setEName(p.displayName);
    setEPos(p.position);
    setEUser(p.username);
    setEPass("");
    setEOrgEmail(p.organizerEmail ?? "");
    setError(null);
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const a = getCurrentOperator();
    if (!a || !editId) return;
    const patch =
      editId === IT_MASTER_PROFILE_ID
        ? { username: eUser, password: ePass || undefined, organizerEmail: eOrgEmail }
        : {
            displayName: eName,
            position: ePos,
            username: eUser,
            password: ePass || undefined,
          };
    const res = updateOperator(a, editId, patch);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setEditId(null);
    refresh();
    window.dispatchEvent(new CustomEvent("volleyschedule-admin-session-changed"));
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const a = getCurrentOperator();
    if (!a) return;
    const res = addAdministrator(a, cName, cPos, cUser, cPass);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setShowCreate(false);
    setCName("");
    setCPos("");
    setCUser("");
    setCPass("");
    refresh();
  }

  function confirmDelete(p: AdminOperatorPublic) {
    const a = getCurrentOperator();
    if (!a) return;
    const msg =
      p.role === "it_master"
        ? "¿Eliminar el perfil IT maestro? El administrador quedará bloqueado hasta volver a configurar."
        : `¿Eliminar el perfil de ${p.displayName}?`;
    if (!window.confirm(msg)) return;
    const res = deleteOperator(a, p.id);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    refresh();
    if (p.role === "it_master") {
      router.replace("/admin/setup");
    }
  }

  const canManageProfiles = actor.role === "it_master" || actor.role === "administrator";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Perfiles de operador</h1>
        <p className="mt-1 text-sm text-zinc-600">
          El perfil IT maestro tiene control total. Los administradores gestionan el día a día; no pueden
          modificar ni eliminar el IT maestro.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {canManageProfiles ? (
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setError(null);
          }}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Nuevo administrador
        </button>
      ) : null}

      {showCreate ? (
        <form
          onSubmit={submitCreate}
          className="max-w-md space-y-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-bold text-zinc-900">Crear administrador</h2>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Nombre completo</label>
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Posición / rol visible</label>
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={cPos}
              onChange={(e) => setCPos(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Usuario</label>
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={cUser}
              onChange={(e) => setCUser(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Contraseña (mín. 6)</label>
            <input
              type="password"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={cPass}
              onChange={(e) => setCPass(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white">
              Guardar
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Posición</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Correo copia</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const isIt = p.role === "it_master";
              const isSelf = actor?.id === p.id;
              const othersCanEditIt = isIt && actor.role !== "it_master";
              const canEdit =
                !othersCanEditIt &&
                (isIt
                  ? actor.role === "it_master" && isSelf
                  : actor.role === "it_master" || actor.role === "administrator");
              const canDeleteItSelf = isIt && actor.role === "it_master" && isSelf;
              const canDeleteAdmin =
                !isIt && (actor.role === "it_master" || actor.role === "administrator");
              return (
                <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {isIt ? IT_MASTER_DISPLAY_NAME : p.displayName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{isIt ? IT_MASTER_POSITION : p.position}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.username}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-zinc-500" title={p.organizerEmail ?? ""}>
                    {isIt ? p.organizerEmail ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {p.role === "it_master" ? "IT maestro" : "Administrador"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit ? (
                      <button
                        type="button"
                        className="text-sky-600 hover:underline"
                        onClick={() => openEdit(p)}
                      >
                        Editar
                      </button>
                    ) : othersCanEditIt ? (
                      <span className="text-xs text-zinc-400">Solo el IT maestro edita este perfil</span>
                    ) : null}
                    {canDeleteItSelf || canDeleteAdmin ? (
                      <button
                        type="button"
                        className="ml-3 text-red-600 hover:underline"
                        onClick={() => confirmDelete(p)}
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveEdit}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-zinc-900">
              {editId === IT_MASTER_PROFILE_ID ? "Editar tu acceso IT" : "Editar perfil"}
            </h2>
            {editId === IT_MASTER_PROFILE_ID ? (
              <p className="mt-1 text-xs text-zinc-500">
                {IT_MASTER_DISPLAY_NAME} · {IT_MASTER_POSITION}
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              {editId !== IT_MASTER_PROFILE_ID ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600">Nombre</label>
                    <input
                      className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                      value={eName}
                      onChange={(e) => setEName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600">Posición</label>
                    <input
                      className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                      value={ePos}
                      onChange={(e) => setEPos(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : null}
              {editId === IT_MASTER_PROFILE_ID ? (
                <div>
                  <label className="text-xs font-semibold text-zinc-600">
                    Correo del organizador (constancias / BCC)
                  </label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="tu@gmail.com — vacío para quitar"
                    value={eOrgEmail}
                    onChange={(e) => setEOrgEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Debe coincidir con <code className="rounded bg-zinc-50 px-0.5">ORGANIZER_BCC</code> en{" "}
                    <code className="rounded bg-zinc-50 px-0.5">.env.local</code> para recibir copia de los PDF.
                  </p>
                </div>
              ) : null}
              <div>
                <label className="text-xs font-semibold text-zinc-600">Usuario</label>
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  value={eUser}
                  onChange={(e) => setEUser(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600">
                  Nueva contraseña (dejar vacío para no cambiar)
                </label>
                <input
                  type="password"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  value={ePass}
                  onChange={(e) => setEPass(e.target.value)}
                  minLength={ePass ? 6 : 0}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
                Guardar
              </button>
              <button type="button" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm" onClick={() => setEditId(null)}>
                Cerrar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
