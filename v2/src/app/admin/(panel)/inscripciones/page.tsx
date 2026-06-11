import { getRegistrations, getTournaments } from "@/lib/store";
import { categoryLabel } from "@/lib/types";
import RegistrationsTable, {
  type RegistrationRow,
} from "@/components/admin/RegistrationsTable";

export const dynamic = "force-dynamic";

export const metadata = { title: "Inscripciones" };

export default async function AdminRegistrationsPage() {
  const [registrations, tournaments] = await Promise.all([
    getRegistrations(),
    getTournaments(),
  ]);

  const tournamentBySlug = new Map(tournaments.map((t) => [t.slug, t]));
  const rows: RegistrationRow[] = registrations.map((r) => {
    const tournament = tournamentBySlug.get(r.tournamentSlug);
    const category = tournament?.categories.find((c) => c.id === r.categoryId);
    return {
      id: r.id,
      clubName: r.clubName,
      teamName: r.teamName,
      tournamentSlug: r.tournamentSlug,
      tournamentName: tournament?.name ?? r.tournamentSlug,
      categoryLabel: tournament && category ? categoryLabel(tournament, category) : "—",
      registeredAt: r.registeredAt,
      feeCents: r.feeCents,
      approval: r.approval,
      paymentStatus: r.paymentStatus,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Inscripciones</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Todas las inscripciones de equipos en la plataforma.
        </p>
      </div>
      <RegistrationsTable
        registrations={rows}
        tournaments={tournaments.map((t) => ({ slug: t.slug, name: t.name }))}
        showTournamentFilter
      />
    </div>
  );
}
