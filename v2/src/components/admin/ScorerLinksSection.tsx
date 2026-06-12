"use client";

import { useState } from "react";
import type { ScorerLink } from "@/lib/types";
import { btnPrimary, card, inputClass, labelClass } from "./ui";

interface SafeLink extends Omit<ScorerLink, "pinHash"> {}

interface Props {
  tournamentSlug: string;
  initialLinks: SafeLink[];
}

export default function ScorerLinksSection({ tournamentSlug, initialLinks }: Props) {
  const [links, setLinks] = useState<SafeLink[]>(initialLinks);
  const [open, setOpen] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<SafeLink | null>(null);
  const [copied, setCopied] = useState(false);

  // delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function scorerUrl(token: string): string {
    return `${baseUrl}/anotar/${token}`;
  }

  async function create() {
    setFormError(null);
    if (!name.trim()) { setFormError("El nombre es requerido."); return; }
    if (!/^\d{4}$/.test(pin)) { setFormError("El PIN debe ser exactamente 4 dígitos."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/scorer/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentSlug, name: name.trim(), pin }),
      });
      const data = (await res.json().catch(() => null)) as { link?: SafeLink; error?: string } | null;
      if (!res.ok) { setFormError(data?.error ?? "No se pudo crear el enlace."); return; }
      const created = data!.link!;
      setLinks((l) => [...l, created]);
      setNewLink(created);
      setName("");
      setPin("");
      setOpen(false);
    } catch {
      setFormError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/scorer/links/${id}`, { method: "DELETE" });
      setLinks((l) => l.filter((x) => x.id !== id));
      if (newLink?.id === id) setNewLink(null);
    } finally {
      setDeleting(null);
    }
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Enlaces de anotador</h2>
          <p className="text-xs text-zinc-500">
            Comparte un enlace seguro para anotar resultados sin acceso admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); setFormError(null); setNewLink(null); }}
          className={btnPrimary}
        >
          + Crear enlace
        </button>
      </div>

      {/* Formulario de creación */}
      {open && (
        <div className="border-b border-zinc-200 bg-indigo-50 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre del anotador *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Ana – Cancha 1"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>PIN de 4 dígitos *</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                className={inputClass}
              />
            </div>
          </div>
          {formError && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={create} disabled={saving} className={btnPrimary}>
              {saving ? "Creando…" : "Crear enlace"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Enlace recién creado */}
      {newLink && (
        <div className="border-b border-zinc-200 bg-emerald-50 px-5 py-4">
          <p className="mb-2 text-sm font-semibold text-emerald-800">
            ✓ Enlace creado para {newLink.name}
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 font-mono">
              {scorerUrl(newLink.id)}
            </span>
            <button
              type="button"
              onClick={() => copy(scorerUrl(newLink.id))}
              className="shrink-0 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            Comparte este enlace. El receptor necesitará el PIN para entrar.
          </p>
        </div>
      )}

      {/* Lista de enlaces existentes */}
      {links.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">
          Aún no hay enlaces de anotador para este torneo.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{link.name}</p>
                <p className="truncate font-mono text-xs text-zinc-400">
                  /anotar/{link.id.slice(0, 8)}…
                </p>
              </div>
              <button
                type="button"
                onClick={() => copy(scorerUrl(link.id))}
                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Copiar enlace
              </button>
              <button
                type="button"
                onClick={() => remove(link.id)}
                disabled={deleting === link.id}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting === link.id ? "…" : "Eliminar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
