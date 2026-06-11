import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrations, getTournament } from "@/lib/store";
import ScheduleWorkspace from "@/components/admin/ScheduleWorkspace";

export const dynamic = "force-dynamic";

export default async function ItinerarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();
  const registrations = await getRegistrations({ tournamentSlug: slug });

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-xs text-zinc-500">
          <Link href="/admin/torneos" className="hover:text-zinc-700">
            Torneos
          </Link>
          <span className="mx-1">/</span>
          <Link
            href={`/admin/torneos/${tournament.slug}?tab=itinerario`}
            className="hover:text-zinc-700"
          >
            {tournament.name}
          </Link>
          <span className="mx-1">/</span>
          <span className="text-zinc-700">Itinerario</span>
        </nav>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          Creador de itinerario
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Genera brackets por categoría, asigna horarios y canchas, y anota
          resultados en vivo. El público solo ve el itinerario cuando está
          publicado.
        </p>
      </div>
      <ScheduleWorkspace tournament={tournament} registrations={registrations} />
    </div>
  );
}
