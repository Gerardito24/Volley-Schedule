import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/admin/login");

  const roleLabel = admin.role === "it_master" ? "IT Master" : "Administrador";

  return (
    <div className="min-h-screen bg-zinc-50 lg:flex">
      <AdminSidebar displayName={admin.displayName} roleLabel={roleLabel} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
