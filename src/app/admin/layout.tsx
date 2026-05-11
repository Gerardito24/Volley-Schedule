import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-1 bg-zinc-100 text-zinc-900">
      <AdminSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
