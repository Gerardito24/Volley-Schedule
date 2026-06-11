import Link from "next/link";
import { getClients, getRegistrations } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [clients, registrations] = await Promise.all([getClients(), getRegistrations()]);

  const countByClient = new Map<string, number>();
  for (const r of registrations) {
    if (r.clientId) countByClient.set(r.clientId, (countByClient.get(r.clientId) ?? 0) + 1);
  }

  const sorted = [...clients].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Clientes</h1>
        <p className="text-zinc-400 text-sm mt-1">{clients.length} cuentas registradas</p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-12 text-center text-zinc-400">
          Aún no hay clientes registrados.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Correo</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Teléfono</th>
                <th className="text-right px-4 py-3 font-semibold text-zinc-300">Inscripciones</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-300">Registrado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sorted.map((c) => (
                <tr key={c.id} className="bg-zinc-950 hover:bg-zinc-900 transition">
                  <td className="px-4 py-3 font-medium text-zinc-100">{c.displayName}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">{countByClient.get(c.id) ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(c.createdAt).toLocaleDateString("es-PR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="text-xs text-amber-400 hover:underline"
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
