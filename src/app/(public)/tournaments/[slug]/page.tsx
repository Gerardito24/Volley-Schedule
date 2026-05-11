import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTournamentBySlug } from "@/lib/mock-data";
import { effectiveCategoryFeeCents } from "@/lib/tournament-pricing";

type Props = { params: Promise<{ slug: string }> };

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const t = getTournamentBySlug(slug);
  if (!t) return { title: "Torneo no encontrado" };
  return {
    title: `${t.name} · VolleySchedule`,
    description: t.description,
  };
}

export default async function TournamentDetailPage(props: Props) {
  const { slug } = await props.params;
  const tournament = getTournamentBySlug(slug);
  if (!tournament) notFound();

  const open = tournament.status === "open";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <Link
          href="/tournaments"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← Todos los torneos
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {tournament.name}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Torneo: {tournament.tournamentStartsOn} — {tournament.tournamentEndsOn} ·{" "}
          {tournament.locationLabel}
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Fecha límite de inscripción: {tournament.registrationDeadlineOn}
        </p>
        {tournament.publicEntryFeeCents != null ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Entrada al público: {formatMoney(tournament.publicEntryFeeCents)}
          </p>
        ) : null}
        <p className="mt-4 leading-relaxed text-zinc-700 dark:text-zinc-300">
          {tournament.description}
        </p>
        {tournament.promoImageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.promoImageDataUrl}
            alt=""
            className="mt-6 max-h-64 w-full rounded-xl border border-zinc-200 object-contain dark:border-zinc-800"
          />
        ) : null}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Categorías y tarifas
        </h2>
        <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tournament.categories.map((c) => {
            const eff = effectiveCategoryFeeCents(c, tournament);
            return (
              <li key={c.id} className="px-4 py-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {c.label}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {eff != null ? formatMoney(eff) : "—"}
                    {c.maxTeams != null ? ` · máx. ${c.maxTeams} equipos` : ""}
                  </span>
                </div>
                {c.subdivisions.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Divisiones: {c.subdivisions.map((s) => s.label).join(", ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <div>
        {open ? (
          <Link
            href={`/tournaments/${tournament.slug}/register`}
            className="inline-flex rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Inscribir un equipo
          </Link>
        ) : (
          <p className="text-sm text-zinc-500">Las inscripciones están cerradas.</p>
        )}
      </div>
    </main>
  );
}
