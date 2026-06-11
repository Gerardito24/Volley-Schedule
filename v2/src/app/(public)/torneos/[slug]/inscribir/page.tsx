import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTournament } from "@/lib/store";
import { formatDateEs, formatDateRangeEs } from "@/lib/types";
import RegisterForm from "@/components/public/RegisterForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  return { title: tournament ? `Inscripción · ${tournament.name}` : "Inscripción" };
}

export default async function InscribirPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament || tournament.status !== "open") notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20">
      <header className="py-10 sm:py-14">
        <Link
          href={`/torneos/${tournament.slug}`}
          className="text-sm font-medium text-amber-400 hover:text-amber-300"
        >
          ← {tournament.name}
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Inscribe tu equipo
        </h1>
        <p className="mt-3 text-zinc-400">
          {formatDateRangeEs(tournament.startsOn, tournament.endsOn)} · Inscripciones hasta el{" "}
          {formatDateEs(tournament.registrationDeadlineOn)}.
        </p>
      </header>

      <RegisterForm tournament={tournament} />
    </div>
  );
}
