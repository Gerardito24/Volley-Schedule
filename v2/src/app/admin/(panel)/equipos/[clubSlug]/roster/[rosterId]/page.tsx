import Link from "next/link";
import { notFound } from "next/navigation";
import { getClub, getRegistration, getRoster, getTournament } from "@/lib/store";
import type { TeamRoster } from "@/lib/types";
import RosterEditor from "@/components/admin/RosterEditor";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubSlug: string; rosterId: string }>;
}

export default async function RosterEditorPage({ params }: PageProps) {
  const { clubSlug, rosterId } = await params;
  const roster = await getRoster(rosterId);
  if (!roster || roster.clubSlug !== clubSlug) notFound();

  const [club, tournament, registration] = await Promise.all([
    getClub(clubSlug),
    getTournament(roster.tournamentSlug),
    getRegistration(roster.registrationId),
  ]);

  // Rosters creados antes del modelo completo: heredar de la inscripción
  // original los datos que falten (afiliaciones, nacimiento, apoderado).
  const playerById = new Map(registration?.players.map((p) => [p.id, p]) ?? []);
  const enriched: TeamRoster = {
    ...roster,
    coachAffiliation:
      roster.coachAffiliation ?? registration?.coach.affiliationNumber,
    repName: roster.repName ?? registration?.representative.name,
    repPhone: roster.repPhone ?? registration?.representative.phone,
    repAffiliation:
      roster.repAffiliation ?? registration?.representative.affiliationNumber,
    players: roster.players.map((p) => {
      const original = playerById.get(p.id);
      return {
        ...p,
        birthDate: p.birthDate ?? original?.birthDate,
        affiliationNumber: p.affiliationNumber ?? original?.affiliationNumber,
      };
    }),
  };

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
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{roster.teamName}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {roster.clubName}
              {tournament ? ` · ${tournament.name}` : ""}
            </p>
          </div>
          <DeleteButton
            url={`/api/rosters/${roster.id}`}
            confirmTitle="Eliminar equipo guardado"
            confirmDescription={`Se eliminará el roster de ${roster.teamName}. La inscripción en el torneo se conserva.`}
            redirectTo={`/admin/equipos/${clubSlug}`}
            actionLabel="Eliminar equipo"
          />
        </div>
      </div>

      <RosterEditor roster={enriched} />
    </div>
  );
}
