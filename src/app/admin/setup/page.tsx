"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IT_MASTER_DISPLAY_NAME,
  IT_MASTER_POSITION,
  IT_MASTER_PROFILE_ID,
} from "@/lib/admin-operator-types";
import { AdminStorageOriginHint } from "@/components/admin/AdminStorageOriginHint";
import { createItMaster, hasItMasterProfile, setSession } from "@/lib/admin-operators-store";
import { isRemoteDbEnabled } from "@/lib/remote-data";

function envLocalSnippet(organizerEmail: string): string {
  const bccLine = organizerEmail.trim()
    ? `ORGANIZER_BCC=${organizerEmail.trim()}`
    : `# ORGANIZER_BCC=tu-correo@gmail.com`;
  return `# 1) Crea una API key en https://resend.com/api-keys y pégala abajo.
RESEND_API_KEY=

# 2) Remitente verificado en Resend. En pruebas suele servir:
RESEND_FROM=onboarding@resend.dev

# 3) Copia oculta de las constancias (registro de club) al organizador — mismo correo que indicaste arriba si aplica:
${bccLine}
`;
}

export default function AdminSetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [postCreateSnippet, setPostCreateSnippet] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [useRemote, setUseRemote] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteCheckError, setRemoteCheckError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await isRemoteDbEnabled();
      if (cancelled) return;
      setUseRemote(remote);
      if (!remote) return;
      const res = await fetch("/api/admin/setup", { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setRemoteCheckError(
          "No se pudo conectar a la base de datos. Revisa DATABASE_URL en Vercel (proyecto admin) y ejecuta npm run db:migrate contra Railway.",
        );
        setRemoteReady(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { needsSetup?: boolean };
      if (cancelled) return;
      if (data.needsSetup === false) {
        router.replace("/admin/login");
        return;
      }
      setRemoteReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCopyDone(false);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      if (useRemote) {
        const res = await fetch("/api/admin/setup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username, password, organizerEmail }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
        if (!res.ok) {
          setError(typeof data.message === "string" ? data.message : "No se pudo crear el perfil.");
          return;
        }
        router.replace("/admin");
        return;
      }

      if (hasItMasterProfile()) {
        router.replace("/admin/login");
        return;
      }
      const res = createItMaster(username, password, organizerEmail);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPostCreateSnippet(envLocalSnippet(organizerEmail));
    } finally {
      setBusy(false);
    }
  }

  function enterAdmin() {
    setSession(IT_MASTER_PROFILE_ID);
    router.replace("/admin");
  }

  async function copySnippet() {
    if (!postCreateSnippet) return;
    try {
      await navigator.clipboard.writeText(postCreateSnippet);
      setCopyDone(true);
    } catch {
      setError("No se pudo copiar al portapapeles; selecciona el texto manualmente.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600/90">
          Portal de Administrador
        </p>
        <h1 className="mt-3 text-xl font-bold text-zinc-900">Configuración inicial</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Crea el perfil IT maestro. Sin este perfil el portal no estará disponible.
          {useRemote ? (
            <span className="mt-1 block text-xs text-sky-700">
              Los datos se guardarán en la base de datos compartida.
            </span>
          ) : null}
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

        {remoteCheckError ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {remoteCheckError}
          </div>
        ) : null}

        {useRemote && !remoteReady ? (
          <p className="mt-6 text-sm text-zinc-500">Comprobando configuración…</p>
        ) : postCreateSnippet ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-semibold text-zinc-900">Correo y constancias (Resend)</p>
            <p className="text-sm text-zinc-600">
              El sitio envía PDFs con un servicio llamado Resend; hace falta una clave en el servidor (no se puede
              guardar solo con el navegador). Si ya tienes un Gmail u otro correo para recibir copias, pégalo en{" "}
              <code className="rounded bg-zinc-100 px-1 text-xs">.env.local</code> como <code className="rounded bg-zinc-100 px-1 text-xs">ORGANIZER_BCC</code>{" "}
              (coincide con el correo que guardamos en tu perfil si lo indicaste).
            </p>
            <textarea
              readOnly
              rows={10}
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs text-zinc-800"
              value={postCreateSnippet}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copySnippet()}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                {copyDone ? "Copiado" : "Copiar bloque"}
              </button>
              <a
                href="https://resend.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Abrir Resend
              </a>
            </div>
            <p className="text-xs text-zinc-500">
              Crea el archivo <code className="rounded bg-zinc-100 px-1">.env.local</code> en la raíz del proyecto, pega
              el bloque, completa <code className="rounded bg-zinc-100 px-1">RESEND_API_KEY</code> y reinicia{" "}
              <code className="rounded bg-zinc-100 px-1">npm run dev</code>.
            </p>
            <button
              type="button"
              onClick={enterAdmin}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Entrar al administrador
            </button>
          </div>
        ) : (
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
            <div>
              <label className="block text-xs font-semibold text-zinc-600">
                Correo del organizador (recomendado)
              </label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="tu@gmail.com — para copia BCC de constancias"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Se guarda en tu perfil. Para que el servidor te mande copia oculta de los PDF de registro de club, la
                misma dirección debe ir en <code className="rounded bg-zinc-100 px-0.5">ORGANIZER_BCC</code> en{" "}
                <code className="rounded bg-zinc-100 px-0.5">.env.local</code> (te mostramos el texto al crear el
                perfil).
              </p>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Crear perfil IT"}
            </button>
          </form>
        )}
        <AdminStorageOriginHint />
      </div>
    </div>
  );
}
