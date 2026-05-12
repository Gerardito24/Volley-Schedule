"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IT_MASTER_DISPLAY_NAME,
  IT_MASTER_POSITION,
} from "@/lib/admin-operator-types";
import { createItMaster, hasItMasterProfile, setSession } from "@/lib/admin-operators-store";

export default function AdminSetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (hasItMasterProfile()) {
      router.replace("/admin/login");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    const res = createItMaster(username, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setSession(res.value!.id);
    router.replace("/admin");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">Configuración inicial</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Crea el perfil IT maestro. Sin este perfil el panel de administración no está disponible.
        </p>

        <div className="mt-6 space-y-3 rounded-lg bg-zinc-50 p-4 text-sm">
          <p>
            <span className="font-semibold text-zinc-700">Nombre: </span>
            {IT_MASTER_DISPLAY_NAME}
          </p>
          <p>
            <span className="font-semibold text-zinc-700">Posición: </span>
            {IT_MASTER_POSITION}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Usuario</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Contraseña</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Confirmar contraseña</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Crear perfil IT e iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
