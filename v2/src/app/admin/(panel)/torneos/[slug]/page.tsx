import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrations, getTournament } from "@/lib/store";
import {
  categoryLabel,
  formatDateEs,
  formatDateRangeEs,
  isBracketEligible,
} from "@/lib/types";
import { TournamentStatusChip } from "@/components/admin/StatusChip";
import RegistrationsTable, {
  type RegistrationRow,
} from "@/components/admin/RegistrationsTable";
import TournamentConfigForm from "@/components/admin/TournamentConfigForm";
import TournamentCategoriesEditor from "@/components/admin/TournamentCategoriesEditor";
import { btnPrimary, card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "configuracion", label: "Configuración" },
  { id: "categorias", label: "Categorías" },
  { id: "inscripciones", label: "Inscripciones" },
  { id: "itinerario", label: "Itinerario" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function TournamentDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const tab: TabId = TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : "resumen";
  const registrations = await getRegistrations({ tournamentSlug: slug });

  const eligibleCount = registrations.filter(isBracketEligible).length;
  const totalCourts = tournament.venues.reduce((sum, v) => sum + v.courtCount, 0);

  const categoryById = new Map(tournament.categories.map((c) => [c.id, c]));
  const registrationRows: RegistrationRow[] = registrations.map((r) => {
    const category = categoryById.get(r.categoryId);
    return {
      id: r.id,
      clubName: r.clubName,
      teamName: r.teamName,
      tournamentSlug: r.tournamentSlug,
      tournamentName: tournament.name,
      categoryLabel: category ? categoryLabel(tournament, category) : "—",
      registeredAt: r.registeredAt,
      feeCents: r.feeCents,
      approval: r.approval,
      paymentStatus: r.paymentStatus,
    };
  });

  const scheduleCategories = tournament.schedule?.categories ?? [];
  const totalMatches = scheduleCategories.reduce((sum, c) => sum + c.matches.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/torneos"
          className="text-sm font-medium text-zinc-500 hover:text-indigo-600"
        >
          ← Torneos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{tournament.name}</h1>
          <TournamentStatusChip status={tournament.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {formatDateRangeEs(tournament.startsOn, tournament.endsOn)} · Cierre de inscripciones:{" "}
          {formatDateEs(tournament.registrationDeadlineOn)}
        </p>
      </div>

      <nav className="thin-scroll flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/torneos/${slug}?tab=${t.id}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "resumen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Inscripciones totales", value: registrations.length },
              { label: "Pagadas / aprobadas", value: eligibleCount },
              { label: "Categorías", value: tournament.categories.length },
              { label: "Canchas totales", value: totalCourts },
            ].map((m) => (
              <div key={m.label} className={`${card} p-5`}>
                <p className="text-3xl font-semibold text-zinc-900">{m.value}</p>
                <p className="mt-1 text-sm text-zinc-500">{m.label}</p>
              </div>
            ))}
          </div>

          <div className={`${card} p-6`}>
            <h2 className="text-lg font-semibold text-zinc-900">Datos del torneo</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-zinc-500">Fechas</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {formatDateRangeEs(tournament.startsOn, tournament.endsOn)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-zinc-500">Cierre de inscripciones</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {formatDateEs(tournament.registrationDeadlineOn)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-zinc-500">Sedes</dt>
                <dd className="mt-0.5 text-zinc-900">
                  {tournament.venues.length === 0 ? (
                    <span className="text-zinc-400">Sin sedes definidas</span>
                  ) : (
                    tournament.venues
                      .map((v) => `${v.label} (${v.courtCount} canchas)`)
                      .join(" · ")
                  )}
                </dd>
              </div>
              {tournament.description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-zinc-500">Descripción</dt>
                  <dd className="mt-0.5 text-zinc-900">{tournament.description}</dd>
                </div>
              )}
            </dl>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-100 pt-5">
              <Link
                href={`/admin/torneos/${slug}?tab=configuracion`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Editar configuración →
              </Link>
              <Link
                href={`/admin/torneos/${slug}?tab=inscripciones`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Ver inscripciones →
              </Link>
              <Link
                href={`/admin/torneos/${slug}/itinerario`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Creador de itinerario →
              </Link>
            </div>
          </div>
        </div>
      )}

      {tab === "configuracion" && <TournamentConfigForm tournament={tournament} />}

      {tab === "categorias" && <TournamentCategoriesEditor tournament={tournament} />}

      {tab === "inscripciones" &&
        (registrationRows.length === 0 ? (
          <div className={`${card} p-10 text-center`}>
            <p className="font-medium text-zinc-900">Aún no hay inscripciones</p>
            <p className="mt-1 text-sm text-zinc-500">
              Cuando los clubes inscriban equipos aparecerán aquí.
            </p>
          </div>
        ) : (
          <RegistrationsTable registrations={registrationRows} />
        ))}

      {tab === "itinerario" && (
        <div className={`${card} p-6`}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Itinerario</h2>
            {tournament.schedule?.published ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Publicado
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                Sin publicar
              </span>
            )}
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-zinc-500">Categorías con itinerario</dt>
              <dd className="mt-0.5 text-2xl font-semibold text-zinc-900">
                {scheduleCategories.length}
                <span className="text-sm font-normal text-zinc-500">
                  {" "}
                  de {tournament.categories.length}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500">Partidos generados</dt>
              <dd className="mt-0.5 text-2xl font-semibold text-zinc-900">{totalMatches}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-zinc-100 pt-5">
            <Link href={`/admin/torneos/${slug}/itinerario`} className={btnPrimary}>
              Abrir creador de itinerario
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
