import Link from "next/link";
import NewTournamentWizard from "@/components/admin/NewTournamentWizard";

export const metadata = { title: "Crear torneo" };

export default function NewTournamentPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/torneos"
          className="text-sm font-medium text-zinc-500 hover:text-indigo-600"
        >
          ← Torneos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Crear torneo</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Completa los cuatro pasos para publicar un torneo nuevo.
        </p>
      </div>
      <NewTournamentWizard />
    </div>
  );
}
