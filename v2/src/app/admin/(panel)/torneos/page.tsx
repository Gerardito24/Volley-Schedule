import Link from "next/link";
import { getRegistrations, getTournaments } from "@/lib/store";
import { btnPrimary } from "@/components/admin/ui";
import TournamentsTable, { type TournamentRow } from "@/components/admin/TournamentsTable";

export const dynamic = "force-dynamic";

export const metadata = { title: "Torneos" };

export default async function AdminTournamentsPage() {
  const [tournaments, registrations] = await Promise.all([
    getTournaments(),
    getRegistrations(),
  ]);

  const countBySlug = new Map<string, number>();
  for (const reg of registrations) {
    countBySlug.set(reg.tournamentSlug, (countBySlug.get(reg.tournamentSlug) ?? 0) + 1);
  }

  const rows: TournamentRow[] = tournaments.map((t) => ({
    slug: t.slug,
    name: t.name,
    startsOn: t.startsOn,
    endsOn: t.endsOn,
    status: t.status,
    categoriesCount: t.categories.length,
    registrationsCount: countBySlug.get(t.slug) ?? 0,
    schedulePublished: Boolean(t.schedule?.published),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Torneos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Administra todos los torneos de la plataforma.
          </p>
        </div>
        <Link href="/admin/torneos/nuevo" className={btnPrimary}>
          Crear torneo
        </Link>
      </div>
      <TournamentsTable tournaments={rows} />
    </div>
  );
}
