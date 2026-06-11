import Link from "next/link";
import { getClients, getRegistrations } from "@/lib/store";
import { card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const [clients, registrations] = await Promise.all([getClients(), getRegistrations()]);

  const countByClient = new Map<string, number>();
  for (const r of registrations) {
    if (r.clientId) countByClient.set(r.clientId, (countByClient.get(r.clientId) ?? 0) + 1);
  }

  const sorted = [...clients].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Clientes</h1>
        <p className="mt-1 text-sm text-zinc-500">{clients.length} cuentas registradas</p>
      </div>

      {clients.length === 0 ? (
        <div className={`${card} px-8 py-12 text-center text-sm text-zinc-500`}>
          Aún no hay clientes registrados.
        </div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 text-right font-medium">Inscripciones</th>
                <th className="px-4 py-3 font-medium">Registrado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sorted.map((c) => (
                <tr key={c.id} className="text-zinc-800">
                  <td className="px-4 py-3 font-medium">{c.displayName}</td>
                  <td className="px-4 py-3 text-zinc-500">{c.email}</td>
                  <td className="px-4 py-3 text-zinc-500">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">
                    {countByClient.get(c.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(c.createdAt).toLocaleDateString("es-PR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
