"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClubRegisterForm } from "@/components/ClubRegisterForm";
import { getClubProfile, readClubProfiles } from "@/lib/local-club-profiles";
import type { ClubProfile } from "@/lib/club-profile-types";

export default function EquipoPage() {
  const [profiles, setProfiles] = useState<ClubProfile[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    const bump = () => setProfiles(readClubProfiles());
    bump();
    window.addEventListener("volleyschedule-club-profiles-changed", bump);
    return () => window.removeEventListener("volleyschedule-club-profiles-changed", bump);
  }, []);

  const selectedProfile = useMemo(
    () => (selectedSlug ? getClubProfile(selectedSlug) : null),
    [selectedSlug, profiles],
  );

  return (
    <main className="flex w-full flex-1 flex-col gap-8 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Registro de club
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Mismo flujo en dos pasos que la inscripción a torneo: checklist y formulario completo con roster, firma y
          términos. Al enviar, se guarda el perfil del club y una inscripción interna para que el organizador vea el
          equipo en{" "}
          <Link
            href="/admin/equipos"
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Administración → Equipos
          </Link>{" "}
          (mismo navegador / dispositivo que uses para el admin).
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {profiles.length > 0 ? (
          <aside className="w-full max-w-xs shrink-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Atajo
            </p>
            <h2 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Clubes ya guardados</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Clic para prellenar club y representante en el formulario (paso 2).
            </p>
            <ul className="mt-3 space-y-1">
              {profiles.map((p) => (
                <li key={p.clubSlug}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(p.clubSlug)}
                    className={[
                      "flex w-full flex-col rounded-lg px-2 py-2 text-left text-sm transition",
                      selectedSlug === p.clubSlug
                        ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{p.displayName}</span>
                    <span className="text-xs text-zinc-500">{p.pueblo || "—"}</span>
                  </button>
                </li>
              ))}
            </ul>
            {selectedSlug ? (
              <button
                type="button"
                onClick={() => setSelectedSlug(null)}
                className="mt-3 text-xs font-medium text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Quitar selección
              </button>
            ) : null}
          </aside>
        ) : null}

        <div className="min-w-0 flex-1">
          <ClubRegisterForm key={selectedSlug ?? "new"} initialProfile={selectedProfile} />
        </div>
      </div>
    </main>
  );
}
