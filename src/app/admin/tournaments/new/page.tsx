import Link from "next/link";
import { NewTournamentForm } from "./NewTournamentForm";

export default function AdminNewTournamentPage() {
  return (
    <main className="flex flex-1 flex-col gap-8">
      <div>
        <Link
          href="/admin/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Torneos
        </Link>
        <h2 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Crear torneo
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Se guarda en el navegador (localStorage) hasta tener base de datos.
        </p>
      </div>
      <NewTournamentForm />
    </main>
  );
}
