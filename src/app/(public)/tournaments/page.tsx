import { TournamentCard } from "@/components/TournamentCard";
import { tournaments } from "@/lib/mock-data";

export default function TournamentsPage() {
  const publicTournaments = tournaments.filter((t) => !t.hiddenFromPublic);
  return (
    <main className="flex w-full flex-1 flex-col gap-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Torneos
      </h1>
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publicTournaments.map((t) => (
            <TournamentCard key={t.slug} tournament={t} />
          ))}
        </div>
      </div>
    </main>
  );
}
