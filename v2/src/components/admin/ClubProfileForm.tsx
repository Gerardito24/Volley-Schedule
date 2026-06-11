"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClubProfile } from "@/lib/types";
import { btnPrimary, card, inputClass, labelClass } from "./ui";

export default function ClubProfileForm({ club }: { club: ClubProfile }) {
  const router = useRouter();
  const [pueblo, setPueblo] = useState(club.pueblo);
  const [phone, setPhone] = useState(club.phone ?? "");
  const [contactName, setContactName] = useState(club.contactName);
  const [contactEmail, setContactEmail] = useState(club.contactEmail);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    setError(null);

    if (!pueblo.trim() || !contactName.trim() || !contactEmail.trim()) {
      setError("Pueblo, contacto y correo son requeridos.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/clubs/${club.clubSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pueblo: pueblo.trim(),
          phone: phone.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
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
      <h2 className="text-lg font-semibold text-zinc-900">Perfil del club</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre del club</label>
          <input
            type="text"
            value={club.displayName}
            disabled
            className={`${inputClass} bg-zinc-50 text-zinc-500`}
          />
          <p className="mt-1 text-xs text-zinc-400">
            El nombre no se puede cambiar porque define el identificador del club.
          </p>
        </div>
        <div>
          <label className={labelClass}>Pueblo *</label>
          <input
            type="text"
            value={pueblo}
            onChange={(e) => setPueblo(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Teléfono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="787-555-0123"
          />
        </div>
        <div>
          <label className={labelClass}>Persona de contacto *</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Correo de contacto *</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputClass}
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
