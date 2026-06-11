import Link from "next/link";
import { notFound } from "next/navigation";
import { getClub, getRegistrations, getRosters, getTournaments } from "@/lib/store";
import {
  categoryLabel,
  type ApprovalStatus,
  type PaymentStatus,
  type TeamRoster,
} from "@/lib/types";
import ClubProfileForm from "@/components/admin/ClubProfileForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { ApprovalStatusChip, PaymentStatusChip } from "@/components/admin/StatusChip";
import { card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ clubSlug: string }>;
}

interface CategoryGroup {
  label: string;
  rosters: (TeamRoster & {
    tournamentName: string;
    approval?: ApprovalStatus;
    paymentStatus?: PaymentStatus;
  })[];
}

export default async function ClubDetailPage({ params }: PageProps) {
  const { clubSlug } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();

  const [rosters, tournaments, registrations] = await Promise.all([
    getRosters({ clubSlug }),
    getTournaments(),
    getRegistrations({ clubSlug }),
  ]);

  const tournamentBySlug = new Map(tournaments.map((t) => [t.slug, t]));
  const registrationById = new Map(registrations.map((r) => [r.id, r]));

  // Agrupar equipos por categoría (la misma categoría en torneos distintos se
  // unifica por su etiqueta, p. ej. "14U Open Femenino").
  const groups = new Map<string, CategoryGroup>();
  for (const roster of rosters) {
    const tournament = tournamentBySlug.get(roster.tournamentSlug);
    const category = tournament?.categories.find((c) => c.id === roster.categoryId);
    const label =
      tournament && category ? categoryLabel(tournament, category) : "Sin categoría";
    const group = groups.get(label) ?? { label, rosters: [] };
    const registration = registrationById.get(roster.registrationId);
    group.rosters.push({
      ...roster,
      tournamentName: tournament?.name ?? roster.tournamentSlug,
      approval: registration?.approval,
      paymentStatus: registration?.paymentStatus,
    });
    groups.set(label, group);
  }
  const sortedGroups = [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "es", { numeric: true }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
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
        <DeleteButton
          url={`/api/clubs/${clubSlug}`}
          confirmTitle="Eliminar club"
          confirmDescription={`Se eliminará el perfil de ${club.displayName} y sus ${rosters.length} equipos guardados. Las inscripciones históricas en los torneos se conservan.`}
          redirectTo="/admin/equipos"
          actionLabel="Eliminar club"
        />
      </div>

      <ClubProfileForm club={club} />

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Equipos por categoría</h2>
        <p className="text-sm text-zinc-500">
          {rosters.length} {rosters.length === 1 ? "equipo" : "equipos"} en{" "}
          {sortedGroups.length} {sortedGroups.length === 1 ? "categoría" : "categorías"}
        </p>
      </div>

      {sortedGroups.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="font-medium text-zinc-900">Este club aún no tiene equipos</p>
          <p className="mt-1 text-sm text-zinc-500">
            Cuando inscriba equipos en un torneo aparecerán aquí agrupados por categoría.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedGroups.map((group) => (
            <div key={group.label} className={`${card} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3">
                <h3 className="text-sm font-semibold text-zinc-900">{group.label}</h3>
                <span className="text-xs text-zinc-500">
                  {group.rosters.length} {group.rosters.length === 1 ? "equipo" : "equipos"}
                </span>
              </div>
              <ul className="divide-y divide-zinc-100">
                {group.rosters.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/equipos/${clubSlug}/roster/${r.id}`}
                      className="group flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 group-hover:text-indigo-600">
                          {r.teamName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {r.tournamentName} · Coach: {r.coachName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {r.approval && <ApprovalStatusChip status={r.approval} />}
                        {r.paymentStatus && <PaymentStatusChip status={r.paymentStatus} />}
                        <span>{r.players.length} jugadoras/es →</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
