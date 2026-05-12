import { MergedRegistrationsTable } from "@/components/MergedRegistrationsTable";

export default function AdminRegistrationsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Inscripciones
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Panel para organizadores. Incluye filas guardadas en este navegador
          además del demo. <strong>Abrir</strong> muestra la hoja de inscripción;
          <strong> PDF</strong> por fila; doble clic en celdas para editar. En
          producción: restringir por rol{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">organizer</code> vía
          Supabase y middleware.
        </p>
      </div>
      <MergedRegistrationsTable />
    </main>
  );
}
