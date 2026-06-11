import { getClubs, getRegistrations, getRosters } from "@/lib/store";
import ClubsGrid, { type ClubCard } from "@/components/admin/ClubsGrid";

export const dynamic = "force-dynamic";

export const metadata = { title: "Equipos" };

export default async function AdminClubsPage() {
  const [clubs, rosters, registrations] = await Promise.all([
    getClubs(),
    getRosters(),
    getRegistrations(),
  ]);

  const teamsByClub = new Map<string, number>();
  for (const roster of rosters) {
    teamsByClub.set(roster.clubSlug, (teamsByClub.get(roster.clubSlug) ?? 0) + 1);
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
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Equipos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Clubes registrados y sus rosters guardados para reutilizar entre torneos.
        </p>
      </div>
      <ClubsGrid clubs={cards} />
    </div>
  );
}
