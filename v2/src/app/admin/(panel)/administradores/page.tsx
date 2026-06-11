import { getSessionAdmin } from "@/lib/auth";
import { getAdmins } from "@/lib/store";
import AdminOperatorsManager, {
  type Operator,
} from "@/components/admin/AdminOperatorsManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Administradores" };

export default async function AdministradoresPage() {
  const actor = await getSessionAdmin();
  if (!actor) return null; // el layout ya redirige al login

  const admins = await getAdmins();
  const operators: Operator[] = admins
    .map((a) => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      position: a.position,
      role: a.role,
      createdAt: a.createdAt,
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "it_master" ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Administradores</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gestiona los perfiles que pueden acceder al portal de administrador.
        </p>
      </div>
      <AdminOperatorsManager operators={operators} actor={{ id: actor.id, role: actor.role }} />
    </div>
  );
}
