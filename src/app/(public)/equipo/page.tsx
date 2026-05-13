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
          Tres pasos: checklist, formulario completo (roster, firma, términos) y un último paso donde indicas el correo
          para la constancia. Al pulsar &quot;Guardar registro&quot; se guardan el perfil del club y la inscripción
          interna, y se intenta enviar el PDF a ese correo (requiere configurar Resend en el servidor). El equipo
          aparece en{" "}
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
