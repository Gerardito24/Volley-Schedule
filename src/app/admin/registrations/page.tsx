import Link from "next/link";
import { MergedRegistrationsTable } from "@/components/MergedRegistrationsTable";

export default function AdminRegistrationsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Inscripciones
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Panel para organizadores. <strong>Clic</strong> en la fila o en el club
            para el detalle (incluye roster); <strong>PDF</strong> descarga la hoja;
            <strong> doble clic</strong> en celdas editables en la lista.
          </p>
        </div>
        <Link
          href="/admin/registrations/import"
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          ↑ Importar CSV / Excel
        </Link>
      </div>
      <MergedRegistrationsTable />
    </main>
  );
}
