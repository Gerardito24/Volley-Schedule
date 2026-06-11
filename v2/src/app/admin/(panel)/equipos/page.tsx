import { getClubs, getRegistrations, getRosters, getTournaments } from "@/lib/store";
import { categoryLabel } from "@/lib/types";
import ClubsGrid, { type ClubCard } from "@/components/admin/ClubsGrid";

export const dynamic = "force-dynamic";

export const metadata = { title: "Equipos" };

export default async function AdminClubsPage() {
  const [clubs, rosters, registrations, tournaments] = await Promise.all([
    getClubs(),
    getRosters(),
    getRegistrations(),
    getTournaments(),
  ]);

  const tournamentBySlug = new Map(tournaments.map((t) => [t.slug, t]));

  const teamsByClub = new Map<string, number>();
  const categoriesByClub = new Map<string, Set<string>>();
  for (const roster of rosters) {
    teamsByClub.set(roster.clubSlug, (teamsByClub.get(roster.clubSlug) ?? 0) + 1);
    const tournament = tournamentBySlug.get(roster.tournamentSlug);
    const category = tournament?.categories.find((c) => c.id === roster.categoryId);
    if (tournament && category) {
      const set = categoriesByClub.get(roster.clubSlug) ?? new Set<string>();
      set.add(categoryLabel(tournament, category));
      categoriesByClub.set(roster.clubSlug, set);
    }
  }
  const regsByClub = new Map<string, number>();
  for (const reg of registrations) {
    regsByClub.set(reg.clubSlug, (regsByClub.get(reg.clubSlug) ?? 0) + 1);
  }

  const cards: ClubCard[] = clubs.map((c) => ({
    clubSlug: c.clubSlug,
    displayName: c.displayName,
    pueblo: c.pueblo,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    teamsCount: teamsByClub.get(c.clubSlug) ?? 0,
    registrationsCount: regsByClub.get(c.clubSlug) ?? 0,
    categories: [...(categoriesByClub.get(c.clubSlug) ?? [])].sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true }),
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Equipos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Clubes registrados con sus equipos organizados por categoría.
        </p>
      </div>
      <ClubsGrid clubs={cards} />
    </div>
  );
}
