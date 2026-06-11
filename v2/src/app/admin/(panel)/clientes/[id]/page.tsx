import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient, getRegistrations, getTournaments } from "@/lib/store";
import { formatDateRangeEs } from "@/lib/types";
import { ApprovalStatusChip, PaymentStatusChip } from "@/components/admin/StatusChip";
import { card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/clientes"
          className="mb-3 inline-block text-xs text-zinc-500 transition hover:text-indigo-600"
        >
          ← Clientes
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">{client.displayName}</h1>
        <p className="mt-1 text-sm text-zinc-500">{client.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard label="Correo" value={client.email} />
        <InfoCard label="Teléfono" value={client.phone ?? "—"} />
        <InfoCard
          label="Registrado"
          value={new Date(client.createdAt).toLocaleDateString("es-PR")}
        />
      </div>

      <h2 className="text-lg font-semibold text-zinc-900">
        Inscripciones <span className="text-sm font-normal text-zinc-400">({myRegs.length})</span>
      </h2>

      {myRegs.length === 0 ? (
        <div className={`${card} px-8 py-10 text-center text-sm text-zinc-500`}>
          Este cliente aún no tiene inscripciones.
        </div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Equipo</th>
                <th className="px-4 py-3 font-medium">Torneo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {myRegs.map((reg) => {
                const t = tournamentMap.get(reg.tournamentSlug);
                return (
                  <tr key={reg.id} className="text-zinc-800">
                    <td className="px-4 py-3">
                      <p className="font-medium">{reg.teamName}</p>
                      <p className="text-xs text-zinc-400">{reg.clubName}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <p>{t?.name ?? reg.tournamentSlug}</p>
                      {t && (
                        <p className="text-xs text-zinc-400">
                          {formatDateRangeEs(t.startsOn, t.endsOn)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ApprovalStatusChip status={reg.approval} />
                        <PaymentStatusChip status={reg.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
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
    <div className={`${card} px-4 py-4`}>
      <p className="mb-1 text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}
