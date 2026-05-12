"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getClubProfile,
  readClubProfiles,
  upsertClubProfile,
} from "@/lib/local-club-profiles";
import type { ClubProfile } from "@/lib/club-profile-types";
import { slugify } from "@/lib/slugify";

type Step = "lookup" | "form";

type Draft = Omit<ClubProfile, "clubSlug" | "updatedAt">;

const EMPTY_DRAFT: Draft = {
  displayName: "",
  pueblo: "",
  clubPhone: "",
  contactName: "",
  contactEmail: "",
};

export default function EquipoPage() {
  const [step, setStep] = useState<Step>("lookup");
  const [nameInput, setNameInput] = useState("");
  const [clubSlug, setClubSlug] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saved, setSaved] = useState(false);
  const [existingProfiles, setExistingProfiles] = useState<ClubProfile[]>([]);

  useEffect(() => {
    setExistingProfiles(readClubProfiles());
  }, []);

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    const slug = slugify(name);
    setClubSlug(slug);
    const existing = getClubProfile(slug);
    if (existing) {
      setDraft({
        displayName: existing.displayName,
        pueblo: existing.pueblo,
        clubPhone: existing.clubPhone,
        contactName: existing.contactName,
        contactEmail: existing.contactEmail,
      });
    } else {
      setDraft({ ...EMPTY_DRAFT, displayName: name });
    }
    setStep("form");
  }

  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      upsertClubProfile({
        clubSlug,
        displayName: draft.displayName || nameInput.trim(),
        pueblo: draft.pueblo,
        clubPhone: draft.clubPhone,
        contactName: draft.contactName,
        contactEmail: draft.contactEmail,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setExistingProfiles(readClubProfiles());
      window.setTimeout(() => setSaved(false), 2500);
    },
    [clubSlug, draft, nameInput],
  );

  function field(
    id: keyof Draft,
    label: string,
    placeholder: string,
    type: string = "text",
    required = false,
  ) {
    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
        <input
          id={id}
          type={type}
          required={required}
          placeholder={placeholder}
          value={draft[id]}
          onChange={(e) => setDraft((d) => ({ ...d, [id]: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-8 py-10">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Perfil del equipo / club
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Crea o actualiza la información de contacto de tu club. Los datos se guardan en este
          dispositivo.
        </p>
      </div>

      {step === "lookup" ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Search / create */}
          <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Buscar o crear perfil
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Escribe el nombre de tu club para continuar.
            </p>
            <form onSubmit={handleLookup} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="club-name-search"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Nombre del club
                </label>
                <input
                  id="club-name-search"
                  type="text"
                  required
                  placeholder="Ej. Metro VB"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Continuar
              </button>
            </form>
          </section>

          {/* Saved clubs on this device */}
          {existingProfiles.length > 0 ? (
            <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Clubes guardados en este dispositivo
              </h2>
              <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {existingProfiles.map((p) => (
                  <li key={p.clubSlug} className="py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(p.displayName);
                        setClubSlug(p.clubSlug);
                        setDraft({
                          displayName: p.displayName,
                          pueblo: p.pueblo,
                          clubPhone: p.clubPhone,
                          contactName: p.contactName,
                          contactEmail: p.contactEmail,
                        });
                        setStep("form");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-100">
                        {p.displayName}
                      </span>
                      <span className="text-xs text-zinc-500">{p.pueblo || "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="w-full max-w-xl">
          <button
            type="button"
            onClick={() => setStep("lookup")}
            className="mb-4 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            ← Cambiar club
          </button>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                {draft.displayName || nameInput}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-500 dark:bg-zinc-800">
                {clubSlug}
              </span>
            </div>
            <p className="mb-5 text-xs text-zinc-500">
              ID de club (generado automáticamente del nombre, no se puede cambiar).
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              {field("displayName", "Nombre del club", "Ej. Metro VB", "text", true)}
              {field("pueblo", "Municipio / Pueblo", "Ej. San Juan")}
              {field("clubPhone", "Teléfono del club", "Ej. 787-555-0100", "tel")}
              {field("contactName", "Nombre de contacto", "Coach o director")}
              {field("contactEmail", "Correo de contacto", "contacto@miclub.com", "email")}

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Guardar perfil
                </button>
                {saved ? (
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    ¡Guardado!
                  </span>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
