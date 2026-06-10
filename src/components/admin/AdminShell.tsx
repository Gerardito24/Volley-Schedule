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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = pathname;

    if (path === "/admin/db-migration") {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function runRemoteDbFlow() {
      const dbRes = await fetch("/api/admin/db", { cache: "no-store" });
      if (!dbRes.ok) {
        setLoadError(
          "No se pudo conectar a la base de datos. Revisa DATABASE_URL en Vercel (proyecto admin) y ejecuta npm run db:migrate contra Railway.",
        );
        setReady(true);
        return;
      }

      const dbJson = (await dbRes.json().catch(() => ({}))) as {
        configured?: boolean;
        needsSetup?: boolean;
      };
      const needsSetup = Boolean(dbJson.needsSetup);

      if (cancelled) return;

      if (needsSetup) {
        if (path !== "/admin/setup" && path !== "/admin/db-migration") {
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

      const meRes = await fetch("/api/admin/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const me = (await meRes.json().catch(() => ({}))) as {
        operator?: { id: string } | null;
        message?: string;
      };

      if (cancelled) return;

      if (!meRes.ok) {
        const message =
          typeof me.message === "string"
            ? me.message
            : "Error de sesión del servidor. Revisa ADMIN_SESSION_SECRET en Vercel (proyecto admin).";
        if (path === "/admin/login" || path === "/admin/setup") {
          setLoadError(message);
          setReady(true);
          return;
        }
        router.replace("/admin/login");
        return;
      }

      const loggedIn = Boolean(me?.operator);

      if (!loggedIn) {
        if (path !== "/admin/login") {
          router.replace("/admin/login");
          return;
        }
        setReady(true);
        return;
      }

      if (path === "/admin/login") {
        router.replace("/admin");
        return;
      }

      setReady(true);
    }

    async function runLocalFlow() {
      const hasMaster = hasItMasterProfile();
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

      const session = readSession();
      if (!session) {
        if (path !== "/admin/login") {
          router.replace("/admin/login");
          return;
        }
        setReady(true);
        return;
      }

      if (path === "/admin/login") {
        router.replace("/admin");
        return;
      }

      setReady(true);
    }

    async function run() {
      setLoadError(null);

      const statusRes = await fetch("/api/public/db-status", { cache: "no-store" });
      const statusJson = (await statusRes.json().catch(() => ({}))) as { configured?: boolean };
      const envDbConfigured = statusRes.ok && Boolean(statusJson.configured);

      if (cancelled) return;

      if (envDbConfigured) {
        await runRemoteDbFlow();
        return;
      }

      await runLocalFlow();
    }

    setReady(false);
    void run();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const isPublicShell = pathname === "/admin/setup" || pathname === "/admin/login";

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Cargando…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">Error de configuración</h1>
          <p className="mt-2 text-sm text-red-800">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Reintentar
          </button>
        </div>
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
