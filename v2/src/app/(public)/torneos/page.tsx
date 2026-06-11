import type { Metadata } from "next";
import { getTournaments } from "@/lib/store";
import TournamentCard from "@/components/public/TournamentCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Torneos" };

export default async function TorneosPage() {
  const tournaments = (await getTournaments()).filter((t) => t.status !== "draft");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <header className="py-12 sm:py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
          Torneos
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Todos los torneos de voleibol juvenil en VolleyHub PR. Revisa fechas, categorías y
          tarifas, e inscribe a tu equipo cuando las inscripciones estén abiertas.
        </p>
      </header>

      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-lg font-semibold text-zinc-200">No hay torneos disponibles</p>
          <p className="mt-2 text-sm text-zinc-400">
            Todavía no se ha publicado ningún torneo. Vuelve pronto.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.slug} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
