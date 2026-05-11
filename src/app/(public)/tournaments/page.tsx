import { TournamentCard } from "@/components/TournamentCard";
import { tournaments } from "@/lib/mock-data";

export default function TournamentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Torneos
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Vista pública (preview). Datos de demostración; conectar a Supabase para producción.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {tournaments.map((t) => (
          <TournamentCard key={t.slug} tournament={t} />
        ))}
      </div>
    </main>
  );
}
