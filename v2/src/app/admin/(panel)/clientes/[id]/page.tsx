import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient, getRegistrations, getTournaments } from "@/lib/store";
import { REGISTRATION_STATUS_LABELS, formatDateRangeEs } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  paid:            "bg-blue-500/20 text-blue-300 border-blue-500/30",
  under_review:    "bg-purple-500/20 text-purple-300 border-purple-500/30",
  approved:        "bg-green-500/20 text-green-300 border-green-500/30",
  rejected:        "bg-red-500/20 text-red-300 border-red-500/30",
  waitlisted:      "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, registrations, tournaments] = await Promise.all([
    getClient(id),
    getRegistrations(),
    getTournaments(),
  ]);

  if (!client) notFound();

  const myRegs = registrations
    .filter((r) => r.clientId === client.id)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));

  const tournamentMap = new Map(tournaments.map((t) => [t.slug, t]));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/admin/clientes"
          className="text-xs text-zinc-500 hover:text-amber-400 transition mb-4 inline-block"
        >
          ← Clientes
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">{client.displayName}</h1>
        <p className="text-zinc-400 mt-1">{client.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <InfoCard label="Correo" value={client.email} />
        <InfoCard label="Teléfono" value={client.phone ?? "—"} />
        <InfoCard
          label="Registrado"
          value={new Date(client.createdAt).toLocaleDateString("es-PR")}
        />
      </div>

      <h2 className="text-xl font-bold text-zinc-100 mb-4">
        Inscripciones <span className="text-zinc-500 font-normal text-base">({myRegs.length})</span>
      </h2>

      {myRegs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-10 text-center text-zinc-400">
          Este cliente aún no tiene inscripciones.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Equipo</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Torneo</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {myRegs.map((reg) => {
                const t = tournamentMap.get(reg.tournamentSlug);
                return (
                  <tr key={reg.id} className="bg-zinc-950 hover:bg-zinc-900 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-100">{reg.teamName}</p>
                      <p className="text-xs text-zinc-500">{reg.clubName}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <p>{t?.name ?? reg.tournamentSlug}</p>
                      {t && (
                        <p className="text-xs text-zinc-500">{formatDateRangeEs(t.startsOn, t.endsOn)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[reg.status] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"}`}
                      >
                        {REGISTRATION_STATUS_LABELS[reg.status] ?? reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(reg.registeredAt).toLocaleDateString("es-PR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
