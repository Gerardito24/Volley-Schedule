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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Cargando…
      </div>
    );
  }

  if (isPublicShell) {
    return (
      <div className="min-h-dvh bg-zinc-100 px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] text-zinc-900">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 bg-zinc-100 text-zinc-900">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <AdminSidebar menuOpen={menuOpen} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <AdminTopBar onMenuClick={() => setMenuOpen(true)} />
        <div className="flex-1 overflow-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
