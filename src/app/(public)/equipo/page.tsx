"use client";

import Link from "next/link";
import { ClubRegisterForm } from "@/components/ClubRegisterForm";

export default function EquipoPage() {
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

      <ClubRegisterForm />
    </main>
  );
}
