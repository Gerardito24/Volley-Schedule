import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentRegisterForm } from "@/components/TournamentRegisterForm";
import { getTournamentBySlug } from "@/lib/mock-data";

type Props = { params: Promise<{ slug: string }> };

export default async function RegisterPage(props: Props) {
  const { slug } = await props.params;
  const tournament = getTournamentBySlug(slug);
  if (!tournament || tournament.hiddenFromPublic || tournament.status !== "open") notFound();

  const registerPayload = {
    slug: tournament.slug,
    name: tournament.name,
    registrationDeadlineOn: tournament.registrationDeadlineOn,
    categories: tournament.categories,
    divisions: tournament.divisions,
    registrationFeeCents: tournament.registrationFeeCents,
  };

  return (
    <main className="flex w-full flex-1 flex-col gap-6 py-10">
      <div>
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← {tournament.name}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Inscripción — {tournament.name}
        </h1>
      </div>

      <TournamentRegisterForm tournament={registerPayload} />
    </main>
  );
}
