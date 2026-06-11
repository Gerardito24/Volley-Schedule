import Link from "next/link";
import { notFound } from "next/navigation";
import { getClub, getRoster, getTournament } from "@/lib/store";
import RosterEditor from "@/components/admin/RosterEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubSlug: string; rosterId: string }>;
}

export default async function RosterEditorPage({ params }: PageProps) {
  const { clubSlug, rosterId } = await params;
  const roster = await getRoster(rosterId);
  if (!roster || roster.clubSlug !== clubSlug) notFound();

  const [club, tournament] = await Promise.all([
    getClub(clubSlug),
    getTournament(roster.tournamentSlug),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
          <Link href="/admin/equipos" className="font-medium hover:text-indigo-600">
            Equipos
          </Link>
          <span>/</span>
          <Link
            href={`/admin/equipos/${clubSlug}`}
            className="font-medium hover:text-indigo-600"
          >
            {club?.displayName ?? roster.clubName}
          </Link>
          <span>/</span>
          <span className="text-zinc-900">{roster.teamName}</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{roster.teamName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {roster.clubName}
          {tournament ? ` · ${tournament.name}` : ""}
        </p>
      </div>

      <RosterEditor roster={roster} />
    </div>
  );
}
