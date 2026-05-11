import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournamentBySlug } from "@/lib/mock-data";
import { effectiveCategoryFeeCents } from "@/lib/tournament-pricing";

type Props = { params: Promise<{ slug: string }> };

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-PR", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function RegisterPage(props: Props) {
  const { slug } = await props.params;
  const tournament = getTournamentBySlug(slug);
  if (!tournament || tournament.status !== "open") notFound();

  const categoryLines = tournament.categories.map((c) => {
    const eff = effectiveCategoryFeeCents(c, tournament);
    const feeStr = eff != null ? formatMoney(eff) : "—";
    const subs =
      c.subdivisions.length > 0
        ? ` (${c.subdivisions.map((s) => s.label).join(", ")})`
        : "";
    return `${c.label}${subs}: ${feeStr}`;
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← {tournament.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Inscripción (demo)
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Flujo público para equipos (website). Autenticación Supabase, Stripe y persistencia
          en una siguiente iteración.
        </p>
      </div>

      <ol className="list-decimal space-y-3 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>Elegir categoría (y subdivisión si aplica) y confirmar tarifa.</li>
        <li>Datos del equipo y contacto (coach / manager).</li>
        <li>Pago en línea o referencia de transferencia.</li>
        <li>Subir roster / waiver según reglas del torneo.</li>
      </ol>

      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p className="font-medium text-zinc-800 dark:text-zinc-200">
          Límite de inscripción: {tournament.registrationDeadlineOn}
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1">
          {categoryLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
