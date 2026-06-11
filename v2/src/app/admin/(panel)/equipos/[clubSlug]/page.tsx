import Link from "next/link";
import { notFound } from "next/navigation";
import { getClub, getRosters, getTournaments } from "@/lib/store";
import ClubProfileForm from "@/components/admin/ClubProfileForm";
import { card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubSlug: string }>;
}

export default async function ClubDetailPage({ params }: PageProps) {
  const { clubSlug } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();

  const [rosters, tournaments] = await Promise.all([
    getRosters({ clubSlug }),
    getTournaments(),
  ]);
  const tournamentNameBySlug = new Map(tournaments.map((t) => [t.slug, t.name]));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/equipos"
          className="text-sm font-medium text-zinc-500 hover:text-indigo-600"
        >
          ← Equipos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{club.displayName}</h1>
        <p className="mt-1 text-sm text-zinc-500">{club.pueblo}</p>
      </div>

      <ClubProfileForm club={club} />

      <div className={`${card} p-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">
          Equipos guardados ({rosters.length})
        </h2>
        {rosters.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            Este club aún no tiene rosters guardados.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {rosters.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/equipos/${clubSlug}/roster/${r.id}`}
                  className="group flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900 group-hover:text-indigo-600">
                      {r.teamName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {tournamentNameBySlug.get(r.tournamentSlug) ?? r.tournamentSlug} · Coach:{" "}
                      {r.coachName}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {r.players.length} jugadoras/es →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
