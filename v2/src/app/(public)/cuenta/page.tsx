import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionClient } from "@/lib/client-auth";
import { getRegistrations, getTournaments } from "@/lib/store";
import { REGISTRATION_STATUS_LABELS, formatDateRangeEs } from "@/lib/types";
import LogoutButton from "@/components/public/LogoutButton";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  paid:            "bg-blue-500/20 text-blue-300 border-blue-500/30",
  under_review:    "bg-purple-500/20 text-purple-300 border-purple-500/30",
  approved:        "bg-green-500/20 text-green-300 border-green-500/30",
  rejected:        "bg-red-500/20 text-red-300 border-red-500/30",
  waitlisted:      "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

export default async function CuentaPage() {
  const client = await getSessionClient();
  if (!client) redirect("/cuenta/login");

  const [registrations, tournaments] = await Promise.all([
    getRegistrations(),
    getTournaments(),
  ]);

  const myRegs = registrations
    .filter((r) => r.clientId === client.id)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));

  const tournamentMap = new Map(tournaments.map((t) => [t.slug, t]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-100">Mi cuenta</h1>
          <p className="text-zinc-400 mt-1">{client.email}</p>
        </div>
        <LogoutButton />
      </div>

      <h2 className="text-xl font-bold text-zinc-100 mb-5">Mis inscripciones</h2>

      {myRegs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-12 text-center">
          <p className="text-zinc-400 mb-4">Aún no has inscrito ningún equipo.</p>
          <Link
            href="/torneos"
            className="inline-flex items-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300 transition"
          >
            Ver torneos disponibles
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myRegs.map((reg) => {
            const t = tournamentMap.get(reg.tournamentSlug);
            return (
              <div
                key={reg.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 truncate">
                    {reg.teamName} — {reg.clubName}
                  </p>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {t?.name ?? reg.tournamentSlug}
                    {t && (
                      <span className="ml-2 text-zinc-500">
                        · {formatDateRangeEs(t.startsOn, t.endsOn)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Inscrito {new Date(reg.registeredAt).toLocaleDateString("es-PR")}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLOR[reg.status] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"}`}
                >
                  {REGISTRATION_STATUS_LABELS[reg.status] ?? reg.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
