"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { hasItMasterProfile, readSession } from "@/lib/admin-operators-store";

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasMaster = hasItMasterProfile();
    const session = readSession();
    const path = pathname;

    if (!hasMaster) {
      if (path !== "/admin/setup") {
        router.replace("/admin/setup");
        return;
      }
      setReady(true);
      return;
    }

    if (path === "/admin/setup") {
      router.replace("/admin/login");
      return;
    }

    if (!session) {
      if (path !== "/admin/login") {
        router.replace("/admin/login");
        return;
      }
      setReady(true);
      return;
    }

    if (path === "/admin/login" || path === "/admin/setup") {
      router.replace("/admin");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  const isPublicShell = pathname === "/admin/setup" || pathname === "/admin/login";

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Cargando…
      </div>
    );
  }

  if (isPublicShell) {
    return <div className="min-h-screen bg-zinc-100 text-zinc-900">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-1 bg-zinc-100 text-zinc-900">
      <AdminSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <div className="flex-1 overflow-auto p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
